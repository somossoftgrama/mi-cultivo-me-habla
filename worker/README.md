# Cloudflare Worker - Mi Cultivo Me Habla (deploy actual)

Este es el codigo que esta desplegado en produccion:
https://mi-cultivo-me-habla.rafael-b34.workers.dev/

El backend FastAPI de `src/` (raiz del repo) es referencia; lo que corre es este Worker.

## Deploy

```bash
cd worker
npx wrangler deploy
```

## Secrets (no van en el codigo)

```bash
npx wrangler secret put META_API_KEY
npx wrangler secret put ELEVENLABS_API_KEY
```

## Que incluye (v2)

- UI 100% en espanol, prompts del agente en espanol, TTS es-MX
- Journal persistente por dispositivo (Durable Object SQLite)
- Rate limit: 20 analisis/hora por IP
- Validacion de imagen (tipo + 8MB), SAM 3.1 en paralelo, audio ElevenLabs con fallback a voz del navegador
