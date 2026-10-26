from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, Response
import os

from .agent import respond_to_photo
from .tts_client import text_to_speech

app = FastAPI(title="My Crop Speaks to Me", version="0.1.0")
app.mount("/static", StaticFiles(directory="static"), name="static")

photo_history: list = []


@app.get("/", response_class=HTMLResponse)
async def index():
    with open("static/index.html") as f:
        return f.read()


@app.post("/analyze")
async def analyze(photo: UploadFile = File(...)):
    global photo_history
    image_bytes = await photo.read()
    response_text = await respond_to_photo(image_bytes, photo_history)
    photo_history.append({"role": "assistant", "content": response_text})

    # Intentar generar audio con ElevenLabs (si hay API key configurada)
    audio_url = None
    try:
        from .config import ELEVENLABS_API_KEY
        if ELEVENLABS_API_KEY:
            audio_bytes = await text_to_speech(response_text)
            # Guardar audio temporalmente
            import uuid
            audio_id = str(uuid.uuid4())[:8]
            audio_path = f"static/audio_{audio_id}.mp3"
            with open(audio_path, "wb") as f:
                f.write(audio_bytes)
            audio_url = f"/static/audio_{audio_id}.mp3"
    except Exception:
        pass  # Si TTS falla, devolver solo texto

    return JSONResponse({
        "status": "ok",
        "response": response_text,
        "audio_url": audio_url,
    })


@app.get("/health")
async def health():
    return {"status": "ok", "model": "muse-spark-1.3"}


@app.get("/history")
async def history():
    return {"history": photo_history}
