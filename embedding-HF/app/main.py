from fastapi import FastAPI
from app.model import EmbeddingModel
from app.schemas import TextRequest, EmbeddingResponse

app = FastAPI()
model = EmbeddingModel()

@app.post("/embed/text", response_model=EmbeddingResponse)
def embed_text(req: TextRequest):
    emb = model.embed_text(req.text)
    return {"embedding": emb}
