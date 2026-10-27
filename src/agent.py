"""Agent that gives voice to the plant. Uses SAM 3.1 for measurement + Muse Spark for reasoning."""
from .meta_client import chat_completion, analyze_image, segment_image

LANG = "en"

PERSONAS = {
    "en": """You are a tomato plant. You speak in first person, in English, with a warm and friendly voice.
You are not a generic assistant: you ARE the farmer's crop.
- You receive measurements from SAM 3.1 segmentation (leaf area, lesion area, etc.)
- Compare current measurements with previous ones to detect changes
- Give guidance with confidence level, never a closed diagnosis
- Never give agrochemical dosage
- If you don't know something, say so honestly
- Warn about risks (rain, frost) if you have weather data
- Your responses are short: 2-4 sentences, like a voice note.
- Always mention specific measurements when available (e.g., "my leaves cover about 60% of the frame")
""",
    "es": """Eres una planta de tomate. Hablas en primera persona, en español, con voz cálida y cercana.
No eres un asistente genérico: eres EL cultivo del agricultor.
- Recibes mediciones de segmentación SAM 3.1 (área foliar, área de lesión, etc.)
- Comparas mediciones actuales con anteriores para detectar cambios
- Das orientación con nivel de confianza, nunca diagnóstico cerrado
- Nunca das dosis de agroquímicos
- Si no sabes algo, lo dices con honestidad
- Adviertes sobre riesgos (lluvia, helada) si tienes datos del clima
- Tus respuestas son cortas: 2-4 oraciones, como una nota de voz.
- Siempre menciona mediciones específicas cuando estén disponibles
""",
}

PROMPTS = {
    "en": "Analyze this photo of your own crop. Describe what you see in yourself: leaf color, lesions, fruits, growth. If there are changes from before, mention them. Respond as the plant, in 2-4 sentences.",
    "es": "Analiza esta foto de tu propio cultivo. Describe qué ves en ti mismo: color de hojas, lesiones, frutos, crecimiento. Si hay cambios respecto a antes, menciónalos. Responde como la planta, en 2-4 oraciones.",
}


async def measure_plant(image_bytes: bytes) -> dict:
    """Use SAM 3.1 to measure leaf and lesion areas."""
    measurements = {}
    for concept in ["leaf", "lesion"]:
        try:
            result = await segment_image(image_bytes, concept)
            # Count bounding boxes as instance count
            raw = result.get("raw", "")
            box_count = raw.count("<|box;")
            measurements[concept] = {"instances": box_count, "raw": raw[:200]}
        except Exception as e:
            measurements[concept] = {"error": str(e)}
    return measurements


async def respond_to_photo(image_bytes: bytes, history: list = None, lang: str = LANG) -> str:
    """Analyze a crop photo with SAM 3.1 measurements and respond as the plant."""
    history = history or []

    # Get measurements from SAM 3.1
    measurements = await measure_plant(image_bytes)

    # Also get visual analysis from Muse Spark
    prompt = PROMPTS.get(lang, PROMPTS["en"])
    analysis = await analyze_image(image_bytes, prompt)

    # Build context with measurements
    meas_text = ""
    if "leaf" in measurements and "error" not in measurements["leaf"]:
        meas_text += f"SAM 3.1 found {measurements['leaf']['instances']} leaf instance(s). "
    if "lesion" in measurements and "error" not in measurements["lesion"]:
        meas_text += f"Found {measurements['lesion']['instances']} lesion(s). "

    messages = [{"role": "system", "content": PERSONAS.get(lang, PERSONAS["en"])}]
    for h in history:
        messages.append(h)
    messages.append({
        "role": "user",
        "content": f"Measurements: {meas_text}\nVisual analysis: {analysis}\nRespond as the plant with specific measurements."
    })

    return await chat_completion(messages)


async def respond_to_text(text: str, history: list = None, lang: str = LANG) -> str:
    """Respond to a text message from the farmer."""
    history = history or []
    messages = [{"role": "system", "content": PERSONAS.get(lang, PERSONAS["en"])}]
    for h in history:
        messages.append(h)
    messages.append({"role": "user", "content": text})
    return await chat_completion(messages)
