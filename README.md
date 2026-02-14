# Multimodal Fashion Vector Search Engine

## Overview

This project implements a semantic vector search engine for a fashion product dataset (~44,000 products). It transforms product metadata into dense numerical embeddings using a transformer model and stores them inside PostgreSQL using the pgvector extension for efficient similarity search.

The system enables semantic search — meaning queries are matched based on meaning rather than exact keyword overlap.

---

# What Has Been Built So Far

## 1. Data Pipeline

### Dataset

* ~44,000 fashion products
* Metadata fields such as:

  * productDisplayName
  * masterCategory
  * subCategory
  * articleType
  * baseColour

### Preprocessing

Text fields are:

* Lowercased
* Stripped of null values
* Concatenated into a single field: `text_for_embedding`

Example:

```
"men black casual shirt shirts topwear black"
```

This produces richer semantic context for embedding.

---

## 2. Embedding Model

We use a Sentence Transformer model (MiniLM architecture).

### What is an Embedding?

An embedding is a mapping from text → vector in ℝ^d.

For this model:

* Dimension: 384
* Output: A 384-dimensional floating point vector

Mathematically:

Let:

f(x) : Text → ℝ^384

Where x is a product description.

Each product becomes:

v ∈ ℝ^384

These vectors are normalized:

v_normalized = v / ||v||₂

Where:

||v||₂ = sqrt(Σ vᵢ²)

This ensures cosine similarity works efficiently.

---

## 3. Cosine Similarity (Core Math)

To measure similarity between two embeddings:

Given vectors a and b:

Cosine similarity:

sim(a, b) = (a · b) / (||a|| ||b||)

Since vectors are normalized:

sim(a, b) = a · b

This reduces similarity to a simple dot product.

Interpretation:

* 1 → identical direction (very similar)
* 0 → orthogonal (unrelated)
* -1 → opposite meaning

In PostgreSQL with pgvector, cosine distance is implemented via:

```
embedding <-> query_vector
```

Lower distance = more similar.

---

## 4. Database Architecture

### PostgreSQL + pgvector

We extended PostgreSQL with vector support:

```
CREATE EXTENSION vector;
```

### Table Schema

```
products (
    id BIGINT PRIMARY KEY,
    productDisplayName TEXT,
    masterCategory TEXT,
    subCategory TEXT,
    articleType TEXT,
    baseColour TEXT,
    embedding VECTOR(384)
)
```

Each row contains:

* Raw metadata
* A 384-dimensional embedding vector

---

## 5. Approximate Nearest Neighbor Index

We created an IVFFLAT index:

```
CREATE INDEX products_embedding_idx
ON products
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Why This Matters

Without indexing:

Similarity search = O(n)

With IVFFLAT:

Search becomes approximately:

O(log n)

Conceptually:

1. Vectors are clustered into partitions
2. Query vector searches only nearest clusters
3. Returns approximate nearest neighbors

This enables:

* Sub-second search
* Scalability to millions of vectors

---

## 6. End-to-End Pipeline

System flow:

1. Load dataset
2. Clean and concatenate text
3. Generate embeddings (384-dim)
4. Normalize vectors
5. Insert into PostgreSQL
6. Build ANN index

Result:

A production-grade semantic search backend.

---

# Theoretical Foundations

## Transformer Architecture

MiniLM is a distilled Transformer.

Core idea:

Self-attention computes contextual representations.

Attention mechanism:

Attention(Q, K, V) = softmax(QKᵀ / sqrt(d_k)) V

Where:

* Q = query matrix
* K = key matrix
* V = value matrix

This allows each token to attend to every other token.

The final embedding is typically derived from the [CLS] token or mean pooling.

---

## Vector Space Semantics

Embedding models learn to position semantically similar items close together in vector space.

Properties:

* "black dress" near "evening black gown"
* "running shoes" near "sports sneakers"

Distance in vector space ≈ semantic similarity.

This is based on distributional semantics:

"You shall know a word by the company it keeps."

---

## Complexity Analysis

Without index:

Query cost = O(n · d)

Where:

* n = number of products (44,424)
* d = embedding dimension (384)

With IVFFLAT:

Query cost ≈ O(k · d)

Where:

* k << n

This makes large-scale search feasible.

---

# Current System Diagram

Dataset
↓
Preprocessing
↓
Transformer Embeddings (384-dim)
↓
PostgreSQL + pgvector
↓
IVFFLAT ANN Index
↓
Semantic Similarity Search

---

# Summary

You have built a semantic vector search engine using:

* Transformer-based embeddings
* High-dimensional vector representations
* Cosine similarity mathematics
* Approximate nearest neighbor indexing
* PostgreSQL as a vector database

This forms the mathematical and architectural core of modern AI search systems.
