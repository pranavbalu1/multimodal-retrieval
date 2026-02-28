"""Model wrapper for text/image embedding generation.

This class hides framework-specific details so endpoint handlers can call
simple methods: `embed_text(...)` and `embed_image(...)`.
"""

import io

import numpy as np
import torch
from PIL import Image
from sentence_transformers import SentenceTransformer
from transformers import CLIPModel, CLIPProcessor


class EmbeddingModel:
    """Loads embedding models once and exposes normalized embedding helpers."""

    def __init__(self):
        # -----------------------------
        # Text model
        # -----------------------------
        # MiniLM is compact and fast enough for request-time query embedding.
        # Typical output dimension is 384.
        print("Loading text embedding model (MiniLM)...")
        self.text_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

        # -----------------------------
        # Image model
        # -----------------------------
        # CLIP ViT-B/32 image features are typically 512-dim.
        print("Loading image embedding model (CLIP)...")

        # Use CUDA when available for faster image embedding.
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.image_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.image_model.to(self.device)
        self.image_model.eval()  # inference mode (no dropout, deterministic behavior)

        # CLIPProcessor handles resize/crop/normalize/tokenization plumbing.
        self.image_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

    def embed_text(self, text: str):
        """Return L2-normalized text embedding as JSON-serializable list."""

        # sentence-transformers returns a numpy vector for a single string.
        embedding = self.text_model.encode(text)

        # L2-normalize vector to make cosine/distance comparisons more stable.
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        # Convert to Python list so FastAPI can serialize it to JSON.
        return embedding.tolist()

    def embed_image(self, image_bytes: bytes):
        """Return L2-normalized CLIP image embedding as Python list."""

        # Decode raw bytes and standardize image mode.
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Build model inputs and move tensors to the same device as model params.
        inputs = self.image_processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # No gradient tracking needed for inference.
        with torch.no_grad():
            features = self.image_model.get_image_features(**inputs)

        # Different transformers versions may expose feature tensors differently.
        if isinstance(features, torch.Tensor):
            feature_tensor = features
        elif hasattr(features, "pooler_output") and features.pooler_output is not None:
            feature_tensor = features.pooler_output
        elif hasattr(features, "last_hidden_state") and features.last_hidden_state is not None:
            # Fallback pooling strategy if hidden states are returned.
            feature_tensor = features.last_hidden_state.mean(dim=1)
        else:
            raise ValueError("Unsupported image feature output type from CLIP model")

        # Move to CPU numpy and flatten [1, 512] -> [512].
        embedding = feature_tensor.detach().cpu().numpy().reshape(-1)

        # Defensive assertion to catch model/config drift quickly.
        if embedding.size != 512:
            raise ValueError(f"Expected 512-d image embedding, got {embedding.size}")

        # Normalize to unit length.
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding.tolist()
