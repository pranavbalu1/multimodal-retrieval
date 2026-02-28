from pydantic import BaseModel


# Request schema for text embedding endpoint.
# Example payload: {"text": "red dress"}
class TextRequest(BaseModel):
    text: str


# Response schema shared by text/image embedding endpoints.
# The embedding is returned as a JSON list of floating-point values.
class EmbeddingResponse(BaseModel):
    embedding: list[float]
