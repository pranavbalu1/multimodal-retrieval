# Multimodal Search Monorepo

An end-to-end semantic product search system for fashion catalog data.

This monorepo contains:
- A **FastAPI embedding service** (Python) that generates normalized text embeddings and serves product images
- A **Spring Boot GraphQL API** (Java) that orchestrates embedding + vector search in Postgres
- An **Angular frontend** (TypeScript) with a Redux-style store, enterprise UI, and paginated result grid
- Data and ingestion scripts for preprocessing and indexing product embeddings in **Postgres + pgvector**

**Developer Note:** This project uses multiple backend layers intentionally to explore and experiment with advanced system design concepts. The structure is meant for learning and exploration, not necessarily optimized for efficiency.

<img width="1741" height="476" alt="image" src="https://github.com/user-attachments/assets/ce387b96-c136-4fe5-8e70-a440492469b8" />

## Monorepo Layout

```text
multimodal-search/
|- backend-spring/                 # Spring Boot GraphQL API (Java)
|  \- multimodal/
|- embedding-HF/                   # FastAPI embedding and image service (Python)
|  |- app/
|  |- preprocess.py
|  \- embeddings.py
|- multimodal-frontend/            # Angular app (UI + client state)
|- data/                           # styles.csv, preprocessed CSV, images/
|- docker-compose.yml              # Postgres + pgvector
\- README.md
```

## What Each Part Does

### 1) `embedding-HF` (Python, FastAPI)

Core files:
- `embedding-HF/app/main.py`
- `embedding-HF/app/model.py`
- `embedding-HF/app/schemas.py`

Responsibilities:
- `POST /embed/text`
  - Receives raw query text
  - Uses `sentence-transformers/all-MiniLM-L6-v2`
  - Returns a normalized embedding vector
- `GET /image/{item_id}`
  - Serves product image files from `data/images` by ID (`.jpg`, `.jpeg`, `.png`)
  - Used by the frontend to render result images

### 2) `backend-spring` (Java, Spring Boot + GraphQL)

Core files:
- `backend-spring/multimodal/src/main/resources/graphql/schema.graphqls`
- `backend-spring/multimodal/src/main/java/com/example/multimodal/controller/SearchController.java`
- `backend-spring/multimodal/src/main/java/com/example/multimodal/service/SearchService.java`
- `backend-spring/multimodal/src/main/java/com/example/multimodal/repository/ProductRepository.java`

Responsibilities:
- Exposes GraphQL query:
  - `searchProducts(query: String!, topN: Int!): [Product]`
- On each search:
  1. Calls FastAPI `POST /embed/text` to embed the user query
  2. Queries Postgres via `pgvector` nearest-neighbor search
  3. Returns ranked products with similarity score

### 3) `multimodal-frontend` (Angular)

Core files:
- `multimodal-frontend/src/app/services/search.ts`
- `multimodal-frontend/src/app/store/search.store.ts`
- `multimodal-frontend/src/app/components/search-bar/*`
- `multimodal-frontend/src/app/components/results-grid/*`

Responsibilities:
- Calls GraphQL search endpoint via `/api/graphql` (proxied to Spring)
- Builds image URL per product as `/image/{id}` (proxied to FastAPI)
- Handles loading/error/results state using a Redux-style local store
- Supports:
  - query input
  - user-selectable `topN`
  - result cards with image fallback
  - client-side pagination

### 4) `data` and ingestion scripts

Core files:
- `data/styles.csv`
- `data/preprocessed_products.csv`
- `embedding-HF/preprocess.py`
- `embedding-HF/embeddings.py`

Responsibilities:
- Clean and concatenate metadata into `text_for_embedding`
- Generate embeddings in batches
- Insert into `products` table
- Create `ivfflat` vector index for faster retrieval

## End-to-End Request Flow

1. User submits search query in Angular UI
2. Frontend dispatches search action to local store
3. Frontend sends GraphQL query to Spring:
   - `POST /api/graphql` (dev proxy -> `http://localhost:8080/graphql`)
4. Spring calls FastAPI:
   - `POST http://localhost:8000/embed/text`
5. Spring runs vector similarity query in Postgres (`pgvector`)
6. Spring returns ranked products + similarity
7. Frontend renders cards and requests image URLs:
   - `/image/{id}` (dev proxy -> `http://localhost:8000/image/{id}`)

## Redux-Style State in the Frontend

This repo uses a Redux pattern implemented with RxJS (not NgRx package).

Where:
- `SearchState` is the single app-search state shape
- `SearchAction` describes state transitions
- `searchReducer(state, action)` is pure transition logic
- `SearchStore` holds state in a `BehaviorSubject` and exposes `state$`

State transitions:
- `SEARCH_REQUEST` -> set loading, clear old results, persist current query
- `SEARCH_SUCCESS` -> store products, stop loading
- `SEARCH_FAILURE` -> store error, stop loading

This makes UI state deterministic and easy to reason about.

## Theory (Short Version)

### Embeddings

A text embedding maps a string to a dense vector in `R^d`.

Here:
- model: `all-MiniLM-L6-v2`
- dimension: 384
- normalization: `v_norm = v / ||v||_2`

Normalization allows cosine similarity to align with dot-product behavior.

### Cosine Similarity

Given vectors `a` and `b`:

`cos_sim(a, b) = (a . b) / (||a|| * ||b||)`

With normalized vectors, ranking by cosine similarity is efficient and stable.

### Approximate Nearest Neighbor Search (ANN)

The `ivfflat` pgvector index clusters vectors and searches likely partitions first.

Tradeoff:
- Much faster retrieval at scale
- Slight approximation vs brute-force exact scan

For product search, this is usually the right latency/quality tradeoff.

## Local Setup

### 1) Prerequisites

- Python 3.10+
- Java 17
- Node 20+ (Angular 21 requires modern Node)
- Docker

### 2) Start Postgres (pgvector)

From repo root:

```bash
docker compose up -d
```

Database defaults are in:
- `docker-compose.yml`
- `backend-spring/multimodal/src/main/resources/application.properties`

### 3) Prepare and ingest data (Python)

From `embedding-HF`:

```bash
python preprocess.py
python embeddings.py
```

This prepares text and loads embeddings into Postgres.

### 4) Start FastAPI service

From `embedding-HF`:

```bash
uvicorn app.main:app --reload --port 8000
```

### 5) Start Spring GraphQL API

From `backend-spring/multimodal`:

```bash
./mvnw spring-boot:run
```

Runs on `http://localhost:8080`.

### 6) Start Angular frontend

From `multimodal-frontend`:

```bash
npm install
npm start
```

Runs on `http://localhost:4200` with proxy routes:
- `/api` -> Spring
- `/image` -> FastAPI

Proxy config:
- `multimodal-frontend/proxy.conf.json`

## API Reference (Current)

### GraphQL (Spring)

Query:

```graphql
query SearchProducts($query: String!, $topN: Int!) {
  searchProducts(query: $query, topN: $topN) {
    id
    productDisplayName
    similarity
    masterCategory
    subCategory
    baseColour
  }
}
```

### FastAPI (Python)

- `POST /embed/text`
  - Body: `{ "text": "red dress" }`
  - Response: `{ "embedding": [ ... ] }`

- `GET /image/{item_id}`
  - Returns image bytes if file exists
  - Returns `404` if not found

## Current Scope and Notes

- Retrieval is currently text-embedding driven.
- Images are currently used for result display and can be extended to true image-embedding retrieval later.
- Some scripts/config are still tuned for local development defaults (localhost, fixed creds).

## Suggested Next Improvements

1. Add environment-based config for ports, DB credentials, and service URLs.
2. Add integration tests that cover the full query -> embedding -> DB -> UI flow.
3. Add observability (structured logs + request tracing) across all three services.
4. Add optional hybrid ranking (semantic score + keyword/business metadata).
