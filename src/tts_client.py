"""Cliente TTS con ElevenLabs. Convierte texto a audio (nota de voz)."""
import httpx
from .config import ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"

# Voz por defecto: Rachel (multilingual, buena para español e inglés)
DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"


async def text_to_speech(text: str, voice_id: str = None) -> bytes:
    """Convierte texto a audio MP3 usando ElevenLabs."""
    voice_id = voice_id or ELEVENLABS_VOICE_ID or DEFAULT_VOICE_ID
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ELEVENLABS_BASE}/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.3,
                    "use_speaker_boost": True,
                },
            },
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.content


async def list_voices() -> list:
    """Lista las voces disponibles en ElevenLabs."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ELEVENLABS_BASE}/voices",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json().get("voices", [])
