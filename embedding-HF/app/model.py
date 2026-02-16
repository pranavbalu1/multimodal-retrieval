import io
from PIL import Image
from sentence_transformers import SentenceTransformer
from transformers import CLIPModel, CLIPProcessor
import numpy as np
import torch

class EmbeddingModel:
    def __init__(self):
        print("Loading text embedding model (MiniLM)...")
        self.text_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        print("Loading image embedding model (CLIP)...")
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.image_model = CLIPModel.from_pretrained('openai/clip-vit-base-patch32')
        self.image_model.to(self.device)
        self.image_model.eval()
        self.image_processor = CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')

    def embed_text(self, text: str):
        embedding = self.text_model.encode(text)
        # Normalize vector
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding.tolist()

    def embed_image(self, image_bytes: bytes):
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        inputs = self.image_processor(images=image, return_tensors='pt')
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            features = self.image_model.get_image_features(**inputs)

        # Some transformers builds return a tensor, others return a model output.
        if isinstance(features, torch.Tensor):
            feature_tensor = features
        elif hasattr(features, "pooler_output") and features.pooler_output is not None:
            feature_tensor = features.pooler_output
        elif hasattr(features, "last_hidden_state") and features.last_hidden_state is not None:
            feature_tensor = features.last_hidden_state.mean(dim=1)
        else:
            raise ValueError("Unsupported image feature output type from CLIP model")

        embedding = feature_tensor.detach().cpu().numpy().reshape(-1)
        if embedding.size != 512:
            raise ValueError(f"Expected 512-d image embedding, got {embedding.size}")

        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding.tolist()
    
