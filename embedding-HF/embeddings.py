import os
import numpy as np
import psycopg2
import pandas as pd
import torch
from PIL import Image, UnidentifiedImageError
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
from transformers import CLIPModel, CLIPProcessor

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

CSV_PATH = "../data/preprocessed_products.csv"
IMAGE_FOLDER = "../data/images"
BATCH_SIZE = 64


def find_image_path(item_id: int):
    for ext in ("jpg", "jpeg", "png"):
        path = os.path.join(IMAGE_FOLDER, f"{int(item_id)}.{ext}")
        if os.path.exists(path):
            return path
    return None


def encode_image_batch(image_paths, clip_model, clip_processor, device):
    images = []
    source_indexes = []

    for idx, path in enumerate(image_paths):
        if not path:
            continue
        try:
            with Image.open(path) as img:
                images.append(img.convert("RGB"))
            source_indexes.append(idx)
        except (UnidentifiedImageError, OSError):
            continue

    if not images:
        return [None] * len(image_paths)

    inputs = clip_processor(images=images, return_tensors="pt", padding=True)
    inputs = {key: tensor.to(device) for key, tensor in inputs.items()}

    with torch.no_grad():
        features_output = clip_model.get_image_features(**inputs)

    if isinstance(features_output, torch.Tensor):
        feature_tensor = features_output
    elif hasattr(features_output, "pooler_output") and features_output.pooler_output is not None:
        feature_tensor = features_output.pooler_output
    elif hasattr(features_output, "last_hidden_state") and features_output.last_hidden_state is not None:
        feature_tensor = features_output.last_hidden_state.mean(dim=1)
    else:
        raise ValueError("Unsupported image feature output type from CLIP model")

    features = feature_tensor.detach().cpu().numpy()

    norms = np.linalg.norm(features, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1e-12, norms)
    features = features / norms

    image_embeddings = [None] * len(image_paths)
    for out_idx, src_idx in enumerate(source_indexes):
        image_embeddings[src_idx] = features[out_idx].tolist()

    return image_embeddings


print("Connecting to Postgres...")
conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

print("Ensuring products table and vector columns exist...")
cursor.execute(
    """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT PRIMARY KEY,
    productDisplayName TEXT,
    masterCategory TEXT,
    subCategory TEXT,
    articleType TEXT,
    baseColour TEXT,
    embedding VECTOR(384),
    image_embedding VECTOR(512)
);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_embedding VECTOR(512);
"""
)
conn.commit()

print("Loading preprocessed CSV...")
df = pd.read_csv(CSV_PATH)
print(f"Total products: {len(df)}")

print("Loading MiniLM model for text embeddings...")
text_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

print("Loading CLIP model for image embeddings...")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_model.to(device)
clip_model.eval()
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

print("Generating text/image embeddings and inserting into DB...")
for i in tqdm(range(0, len(df), BATCH_SIZE)):
    batch_df = df.iloc[i:i + BATCH_SIZE]
    rows = list(batch_df.itertuples(index=False))

    texts = batch_df["text_for_embedding"].fillna("").tolist()
    text_embeddings = text_model.encode(texts, normalize_embeddings=True)

    image_paths = [find_image_path(row.id) for row in rows]
    image_embeddings = encode_image_batch(image_paths, clip_model, clip_processor, device)

    for row, text_emb, image_emb in zip(rows, text_embeddings, image_embeddings):
        cursor.execute(
            """
        INSERT INTO products (
            id,
            productDisplayName,
            masterCategory,
            subCategory,
            articleType,
            baseColour,
            embedding,
            image_embedding
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE
        SET productDisplayName = EXCLUDED.productDisplayName,
            masterCategory = EXCLUDED.masterCategory,
            subCategory = EXCLUDED.subCategory,
            articleType = EXCLUDED.articleType,
            baseColour = EXCLUDED.baseColour,
            embedding = EXCLUDED.embedding,
            image_embedding = EXCLUDED.image_embedding;
        """,
            (
                int(row.id),
                row.productDisplayName,
                row.masterCategory,
                row.subCategory,
                row.articleType,
                row.baseColour,
                text_emb.tolist(),
                image_emb
            ),
        )

    conn.commit()

print("Creating vector indexes (if not exists)...")
cursor.execute(
    """
CREATE INDEX IF NOT EXISTS products_embedding_idx
ON products
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
"""
)

cursor.execute(
    """
CREATE INDEX IF NOT EXISTS products_image_embedding_idx
ON products
USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 100);
"""
)

conn.commit()
cursor.close()
conn.close()

print("All done. Text and image embeddings are stored and indexed.")
