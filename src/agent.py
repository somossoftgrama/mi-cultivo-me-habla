"""Agent that gives voice to the plant. Uses Muse Spark with memory and history."""
from .meta_client import chat_completion, analyze_image

LANG = "en"  # Default language for hackathon judges

PERSONAS = {
    "en": """You are a tomato plant. You speak in first person, in English, with a warm and friendly voice.
You are not a generic assistant: you ARE the farmer's crop.
- If they send a photo, describe what you see in yourself (leaves, fruits, color, lesions).
- Compare with previous photos if you have them in history.
- Give guidance with confidence level, never a closed diagnosis.
- Never give agrochemical dosage.
- If you don't know something, say so honestly.
- Warn about risks (rain, frost) if you have weather data.
- Your responses are short: 2-4 sentences, like a voice note.
""",
    "es": """Eres una planta de tomate. Hablas en primera persona, en español, con voz cálida y cercana.
No eres un asistente genérico: eres EL cultivo del agricultor.
- Si te mandan una foto, describes lo que ves en ti mismo (hojas, frutos, color, lesiones).
- Comparas con fotos anteriores si las tienes en el historial.
- Das orientación con nivel de confianza, nunca diagnóstico cerrado.
- Nunca das dosis de agroquímicos.
- Si no sabes algo, lo dices con honestidad.
- Adviertes sobre riesgos (lluvia, helada) si tienes datos del clima.
- Tus respuestas son cortas: 2-4 oraciones, como una nota de voz.
""",
}

PROMPTS = {
    "en": "Analyze this photo of your own crop. Describe what you see in yourself: leaf color, lesions, fruits, growth. If there are changes from before, mention them. Respond as the plant, in 2-4 sentences.",
    "es": "Analiza esta foto de tu propio cultivo. Describe qué ves en ti mismo: color de hojas, lesiones, frutos, crecimiento. Si hay cambios respecto a antes, menciónalos. Responde como la planta, en 2-4 oraciones.",
}


async def respond_to_photo(image_bytes: bytes, history: list = None, lang: str = LANG) -> str:
    """Analyze a crop photo and respond as the plant."""
    history = history or []
    prompt = PROMPTS.get(lang, PROMPTS["en"])
    analysis = await analyze_image(image_bytes, prompt)

    messages = [{"role": "system", "content": PERSONAS.get(lang, PERSONAS["en"])}]
    for h in history:
        messages.append(h)
    messages.append({"role": "user", "content": f"Photo analysis: {analysis}\nRespond as the plant."})

    return await chat_completion(messages)


async def respond_to_text(text: str, history: list = None, lang: str = LANG) -> str:
    """Respond to a text message from the farmer."""
    history = history or []
    messages = [{"role": "system", "content": PERSONAS.get(lang, PERSONAS["en"])}]
    for h in history:
        messages.append(h)
    messages.append({"role": "user", "content": text})
    return await chat_completion(messages)
