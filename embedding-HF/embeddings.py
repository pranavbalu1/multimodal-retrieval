# embed_and_insert.py

import os
import psycopg2
import pandas as pd
from tqdm import tqdm
from sentence_transformers import SentenceTransformer

# =============================
# CONFIG
# =============================

DB_CONFIG = {
    "dbname": "multimodal_db",
    "user": "postgres",
    "password": "yourpassword", 
    "host": "localhost",
    "port": "5432"
}

CSV_PATH = "../data/preprocessed_products.csv"  # path to preprocessed CSV
BATCH_SIZE = 100

# =============================
# CONNECT TO DATABASE
# =============================

print("Connecting to Postgres...")
conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

# =============================
# ENSURE TABLE EXISTS
# =============================

print("Ensuring products table exists...")

cursor.execute("""
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT PRIMARY KEY,
    productDisplayName TEXT,
    masterCategory TEXT,
    subCategory TEXT,
    articleType TEXT,
    baseColour TEXT,
    embedding VECTOR(384)
);
""")

conn.commit()

# =============================
# LOAD DATA
# =============================

print("Loading preprocessed CSV...")
df = pd.read_csv(CSV_PATH)

print(f"Total products: {len(df)}")

# =============================
# LOAD EMBEDDING MODEL
# =============================

print("Loading MiniLM model...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# =============================
# INSERT + EMBED
# =============================

print("Generating embeddings and inserting into DB...")

for i in tqdm(range(0, len(df), BATCH_SIZE)):
    batch_df = df.iloc[i:i+BATCH_SIZE]

    texts = batch_df["text_for_embedding"].tolist()
    embeddings = model.encode(texts, normalize_embeddings=True)

    for row, emb in zip(batch_df.itertuples(index=False), embeddings):

        emb_list = emb.tolist()

        cursor.execute("""
        INSERT INTO products (
            id,
            productDisplayName,
            masterCategory,
            subCategory,
            articleType,
            baseColour,
            embedding
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE
        SET embedding = EXCLUDED.embedding;
        """, (
            int(row.id),
            row.productDisplayName,
            row.masterCategory,
            row.subCategory,
            row.articleType,
            row.baseColour,
            emb_list
        ))

    conn.commit()

print("Done inserting embeddings!")

# =============================
# CREATE VECTOR INDEX
# =============================

print("Creating vector index (if not exists)...")

cursor.execute("""
CREATE INDEX IF NOT EXISTS products_embedding_idx
ON products
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
""")

conn.commit()

print("Index created!")

cursor.close()
conn.close()

print("🚀 All done. Your database is now fully embedded and searchable.")
