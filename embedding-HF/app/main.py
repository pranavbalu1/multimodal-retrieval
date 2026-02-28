"""FastAPI entrypoint for the embedding/image microservice.

This service is intentionally small and focused:
- It converts user text into a normalized embedding vector.
- It converts an uploaded image into a normalized CLIP embedding vector.
- It serves catalog product images from disk to support frontend cards.

All three endpoints are consumed by the Spring API and Angular frontend.
"""

import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.model import EmbeddingModel
from app.schemas import EmbeddingResponse, TextRequest

# ----------------------------------------------------------------------------
# Application bootstrap
# ----------------------------------------------------------------------------

# FastAPI app instance (ASGI application object).
app = FastAPI()

# Heavy model initialization happens exactly once at process startup.
# This is important: loading models per request would make endpoint latency
# unusably slow and would waste memory.
model = EmbeddingModel()

# Resolve image folder to an absolute path so calls work regardless of the
# shell's current working directory when uvicorn is launched.
IMAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/images"))


# ----------------------------------------------------------------------------
# Text embedding endpoint
# ----------------------------------------------------------------------------

@app.post("/embed/text", response_model=EmbeddingResponse)
def embed_text(req: TextRequest):
    """Embed incoming query text into a normalized vector.

    Input shape:
      {"text": "red formal dress"}

    Output shape:
      {"embedding": [float, float, ...]}

    The vector is normalized in the model layer, which keeps cosine-style
    ranking stable when used with pgvector distance operators.
    """
    emb = model.embed_text(req.text)
    return {"embedding": emb}


# ----------------------------------------------------------------------------
# Image embedding endpoint
# ----------------------------------------------------------------------------

@app.post("/embed/image", response_model=EmbeddingResponse)
async def embed_image(file: UploadFile = File(...)):
    """Embed an uploaded image into a normalized CLIP vector.

    This endpoint accepts multipart/form-data with field name `file`.
    """

    # Some clients send a generic MIME type; allow that plus normal image/*.
    allowed_generic_type = "application/octet-stream"

    # Reject known-invalid content types early with a clear 400 error.
    if (
        file.content_type
        and not file.content_type.startswith("image/")
        and file.content_type != allowed_generic_type
    ):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    # Read entire uploaded file bytes into memory for PIL/CLIP preprocessing.
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    try:
        # Model layer performs RGB conversion, feature extraction, normalization,
        # and output-size validation.
        emb = model.embed_image(file_bytes)
    except Exception as exc:
        # Return a client-facing error message rather than leaking traceback.
        raise HTTPException(status_code=400, detail=f"Failed to process image: {exc}") from exc

    return {"embedding": emb}


# ----------------------------------------------------------------------------
# Static image serving endpoint
# ----------------------------------------------------------------------------

@app.get("/image/{item_id}")
def get_image(item_id: int):
    """Serve a product image by id using common extensions.

    The frontend calls this endpoint for result cards. We probe multiple file
    extensions because the dataset contains mixed formats.
    """

    # Debug prints are helpful in local development if image paths break.
    print("Current working dir:", os.getcwd())
    print("IMAGE_DIR:", IMAGE_DIR)

    # Probe known extensions in deterministic order.
    for ext in ["jpg", "jpeg", "png"]:
        image_path = os.path.join(IMAGE_DIR, f"{item_id}.{ext}")
        print("Checking:", image_path)

        if os.path.exists(image_path):
            print("Found image!")
            return FileResponse(image_path)

    # Explicit 404 if no file for that product id exists.
    raise HTTPException(status_code=404, detail="Image not found")
