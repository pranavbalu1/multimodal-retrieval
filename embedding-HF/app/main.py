from fastapi import FastAPI, File, HTTPException, UploadFile
from app.model import EmbeddingModel
from app.schemas import TextRequest, EmbeddingResponse
from fastapi.responses import FileResponse
import os

app = FastAPI()
model = EmbeddingModel()
IMAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/images"))

@app.post("/embed/text", response_model=EmbeddingResponse)
def embed_text(req: TextRequest):
    emb = model.embed_text(req.text)
    return {"embedding": emb}


@app.post("/embed/image", response_model=EmbeddingResponse)
async def embed_image(file: UploadFile = File(...)):
    allowed_generic_type = "application/octet-stream"
    if (
        file.content_type
        and not file.content_type.startswith("image/")
        and file.content_type != allowed_generic_type
    ):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    try:
        emb = model.embed_image(file_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {exc}") from exc

    return {"embedding": emb}


@app.get("/image/{item_id}")
def get_image(item_id: int):
    print("Current working dir:", os.getcwd())
    print("IMAGE_DIR:", IMAGE_DIR)

    for ext in ["jpg", "jpeg", "png"]:
        image_path = os.path.join(IMAGE_DIR, f"{item_id}.{ext}")
        print("Checking:", image_path)

        if os.path.exists(image_path):
            print("Found image!")
            return FileResponse(image_path)

    raise HTTPException(status_code=404, detail="Image not found")

