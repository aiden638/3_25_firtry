from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from processor import FlatfootProcessor
import os
import uvicorn

app = FastAPI(title="Flatfoot Analysis API")

# Configure CORS
# In production, you should specify the exact origins. For now, we allow all for testing convenience, 
# but it's better to use an environment variable.
production_origins = [
    "http://localhost:5173", # Local dev
    "https://your-vercel-app-url.vercel.app", # Placeholder for the user's Vercel URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now, but provide comments for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Processor
# Assume the joblib file is in the same directory
model_path = os.path.join(os.path.dirname(__file__), "flatfoot_pipeline.joblib")
processor = FlatfootProcessor(model_path)

@app.get("/")
async def root():
    return {"message": "Flatfoot Analysis API is running"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")
    
    contents = await file.read()
    result, error = processor.process_image(contents)
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return result

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
