"""Cliente para la API de Meta Model API."""
import httpx
from .config import META_API_KEY, META_API_BASE


async def chat_completion(messages: list, model: str = "muse-spark-1.3") -> str:
    """Envía un mensaje a Muse Spark y devuelve la respuesta."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{META_API_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {META_API_KEY}"},
            json={"model": model, "messages": messages},
            timeout=60.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def analyze_image(image_bytes: bytes, prompt: str, model: str = "muse-spark-1.3") -> str:
    """Envía una imagen a Muse Spark para análisis visual."""
    import base64
    b64 = base64.b64encode(image_bytes).decode()
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            ],
        }
    ]
    return await chat_completion(messages, model)


async def transcribe_audio(audio_bytes: bytes, model: str = "muse-voice-transcribe-1.0") -> str:
    """Transcribe audio con Muse Voice Transcribe."""
    async with httpx.AsyncClient() as client:
        files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
        resp = await client.post(
            f"{META_API_BASE}/audio/transcriptions",
            headers={"Authorization": f"Bearer {META_API_KEY}"},
            files=files,
            data={"model": model},
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.json().get("text", "")


async def generate_image(prompt: str, model: str = "muse-image-1.0") -> bytes:
    """Genera una imagen con Muse Image."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{META_API_BASE}/images/generations",
            headers={"Authorization": f"Bearer {META_API_KEY}"},
            json={"model": model, "prompt": prompt, "n": 1, "size": "1024x1024"},
            timeout=120.0,
        )
        resp.raise_for_status()
        data = resp.json()
        import base64
        return base64.b64decode(data["data"][0]["b64_json"])


async def segment_image(image_bytes: bytes, concept: str) -> dict:
    """Segment objects in an image using SAM 3.1. Returns bounding boxes and masks."""
    import base64
    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "model": "sam-3.1",
        "input": [{"role": "user", "content": [
            {"type": "input_text", "text": concept},
            {"type": "input_image", "image_url": f"data:image/jpeg;base64,{b64}"},
        ]}],
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{META_API_BASE}/responses",
            headers={"Authorization": f"Bearer {META_API_KEY}"},
            json=payload,
            timeout=120.0,
        )
        resp.raise_for_status()
        data = resp.json()
        # Extract output text (contains boxes and masks)
        text = ""
        for item in data.get("output", []):
            for c in item.get("content", []):
                text += c.get("text", "")
        return {"concept": concept, "raw": text}
