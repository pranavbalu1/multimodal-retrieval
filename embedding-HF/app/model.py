from sentence_transformers import SentenceTransformer
import numpy as np

class EmbeddingModel:
    def __init__(self):
        print("Loading MiniLM model...")
        self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

    def embed_text(self, text: str):
        embedding = self.model.encode(text)
        # Normalize vector
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding.tolist()
