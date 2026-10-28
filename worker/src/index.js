// Cloudflare Worker for "My Crop Speaks to Me"
// Handles both static serving and API

const META_API_KEY = ""; // MUST come from wrangler secret META_API_KEY
const META_API_BASE = "https://api.meta.ai/v1";
const ELEVENLABS_API_KEY = ""; // MUST come from wrangler secret ELEVENLABS_API_KEY
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Cultivo Me Habla</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(160deg, #0d2818 0%, #1a3a2a 40%, #2d5a3f 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 1.5rem 1rem;
        }
        .container { max-width: 480px; width: 100%; }
        .hero { text-align: center; margin-bottom: 1.5rem; }
        .hero h1 { font-family: 'Playfair Display', serif; font-size: 1.9rem; margin-bottom: 0.4rem; }
        .hero p { opacity: 0.85; font-size: 1rem; line-height: 1.5; }
        .card {
            background: rgba(255,255,255,0.08);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1.2rem;
        }
        .tips {
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 1rem 1.2rem;
            margin-bottom: 1.2rem;
            font-size: 0.85rem;
            line-height: 1.6;
        }
        .tips h3 { margin-bottom: 0.4rem; font-size: 0.95rem; }
        .tips ul { padding-left: 1.2rem; }
        .tips li { margin-bottom: 0.25rem; opacity: 0.85; }
        .upload-area {
            border: 2px dashed rgba(255,255,255,0.25);
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            cursor: pointer;
            transition: border-color 0.2s, background 0.2s;
            min-height: 180px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .upload-area:hover { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.04); }
        .upload-area input { display: none; }
        .upload-area .icon { font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.7; }
        .upload-area p { margin-bottom: 0.3rem; }
        .upload-area .hint { font-size: 0.8rem; opacity: 0.5; }
        .preview { max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 0.8rem; display: none; object-fit: cover; }
        button {
            background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
            color: white;
            border: none;
            padding: 0.9rem 2rem;
            border-radius: 10px;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 1rem;
            width: 100%;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: transform 0.1s, opacity 0.2s;
        }
        button:hover { transform: translateY(-1px); }
        button:disabled { background: #444; cursor: not-allowed; opacity: 0.6; transform: none; }
        .loading { text-align: center; padding: 1.5rem; display: none; }
        .spinner {
            border: 3px solid rgba(255,255,255,0.15);
            border-top: 3px solid #4caf50;
            border-radius: 50%;
            width: 32px; height: 32px;
            animation: spin 1s linear infinite;
            margin: 0 auto 0.6rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading p { opacity: 0.8; font-size: 0.9rem; }
        .response {
            background: rgba(255,255,255,0.1);
            border-left: 4px solid #4caf50;
            border-radius: 12px;
            padding: 1.2rem 1.4rem;
            margin-top: 1.2rem;
            display: none;
            line-height: 1.7;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .response .plant-name { font-weight: 600; color: #a5d6a7; margin-bottom: 0.4rem; font-size: 0.9rem; }
        .response .plant-text { font-style: italic; font-size: 1.05rem; }
        .history { margin-top: 1.5rem; }
        .history h3 { font-size: 0.9rem; opacity: 0.7; margin-bottom: 0.6rem; }
        .history-item { background: rgba(255,255,255,0.06); padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 0.4rem; font-size: 0.85rem; }
        .history-item .date { opacity: 0.5; font-size: 0.75rem; }
        .disclaimer {
            font-size: 0.75rem;
            opacity: 0.5;
            text-align: center;
            margin-top: 1.5rem;
            line-height: 1.5;
            padding: 0 0.5rem;
        }
        .footer {
            text-align: center;
            margin-top: 0.8rem;
            font-size: 0.7rem;
            opacity: 0.35;
        }
        @media (max-width: 400px) {
            .hero h1 { font-size: 1.6rem; }
            .card { padding: 1.2rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <h1>Mi Cultivo Me Habla</h1>
            <p>Manda una foto de tu planta y ella te dirá lo que necesita — con su propia voz.</p>
        </div>

        <div class="tips">
            <h3>Para mejores resultados:</h3>
            <ul>
                <li>Usa luz natural (evita el flash directo)</li>
                <li>Pon una moneda junto a la planta como referencia de tamaño</li>
                <li>Mantén el mismo ángulo y distancia siempre</li>
                <li>Toma fotos cada 2-3 días para ver el progreso</li>
            </ul>
        </div>

        <div class="card" id="onboardingCard" style="display:none;">
            <h2 style="margin-bottom:0.8rem;">¡Bienvenido! 🌱</h2>
            <p style="margin-bottom:1rem;opacity:0.85;">Ponle un nombre a tu planta para seguir su historia juntos.</p>
            <input type="text" id="plantNameInput" placeholder="Ej. Mi Tomatito, Suculenta del balcón..." style="width:100%;padding:0.8rem;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.08);color:#fff;font-size:1rem;margin-bottom:0.8rem;">
            <button onclick="createPlant()" style="margin-top:0;"><span>🌱</span> Empezar</button>
        </div>

        <div class="card" id="plantSelectorCard" style="display:none;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;">
                <select id="plantSelector" onchange="switchPlant(this.value)" style="flex:1;padding:0.6rem;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.08);color:#fff;font-size:1rem;margin-right:0.5rem;"></select>
                <button onclick="showAddPlant()" style="width:auto;padding:0.6rem 1rem;margin-top:0;">+ Añadir</button>
            </div>
            <div id="plantInfo" style="font-size:0.85rem;opacity:0.7;"></div>
        </div>

                <div class="card" id="uploadCard" style="display:none;">
                <div class="upload-area" onclick="document.getElementById('photo').click()" id="uploadArea">
                <div class="icon" id="uploadIcon">📷</div>
                <p id="uploadText">Toca para tomar o elegir una foto</p>
                <p class="hint">JPG/PNG, máx 8MB</p>
                <input type="file" id="photo" accept="image/*" onchange="previewPhoto(this)">
                <img id="preview" class="preview" />
            </div>
            <button id="sendBtn" onclick="sendPhoto()" disabled>
                <span>🌱</span> ¿Qué dice mi planta?
            </button>
        </div>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Tu planta está mirando la foto...</p>
        </div>

        <div class="response" id="response">
            <p class="plant-name">Tu planta dice:</p>
            <p class="plant-text" id="responseText"></p>
            <audio id="audioPlayer" controls style="width:100%;margin-top:0.8rem;display:none;"></audio>
        </div>

        <div class="history" id="historySection" style="display:none;">
            <h3>Historial de fotos</h3>
            <div id="historyList"></div>
        </div>

        <div class="disclaimer">
            <p><strong>Aviso:</strong> Esta es una herramienta de IA con fines informativos. 
            No sustituye el consejo de un agrónomo o experto en plantas. 
            Las respuestas se generan con IA a partir del análisis visual y pueden no ser siempre exactas. 
            Si notas un problema grave en tu planta, consulta a un experto agrícola local.</p>
            <p style="margin-top:0.4rem;">Las fotos se procesan en el momento y no se guardan.</p>
        </div>

        <div class="footer">
            Hecho para el Meta Global AI Developer Hackathon 2026 · v2
        </div>
    </div>

    <script>
        let plants = [];
        let currentPlantId = null;
        let selectedFile = null;

        function getDeviceId() {
            let d = null;
            try { d = localStorage.getItem('mc_device'); } catch (e) {}
            if (!d) {
                d = (crypto.randomUUID ? crypto.randomUUID() : 'dev_' + Date.now() + '_' + Math.floor(Math.random() * 1e6));
                try { localStorage.setItem('mc_device', d); } catch (e) {}
            }
            return d;
        }

        async function apiPost(path, body) {
            try {
                await fetch(path, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...body, device: getDeviceId() })
                });
            } catch (e) { console.warn('sync failed:', path, e.message); }
        }

        function refreshUI() {
            if (plants.length === 0) {
                document.getElementById('onboardingCard').style.display = 'block';
            } else {
                document.getElementById('plantSelectorCard').style.display = 'block';
                document.getElementById('uploadCard').style.display = 'block';
                renderPlantSelector();
                if (!currentPlantId) currentPlantId = plants[0].id;
                document.getElementById('plantSelector').value = currentPlantId;
                updatePlantInfo();
            }
        }

        function loadPlants() {
            const stored = localStorage.getItem('miCultivoPlants');
            plants = stored ? JSON.parse(stored) : [];
            refreshUI();
            syncFromServer();
        }

        // Server journal (Durable Object) is source of truth; localStorage is cache
        async function syncFromServer() {
            try {
                const res = await fetch('/api/journal?device=' + encodeURIComponent(getDeviceId()));
                if (!res.ok) return;
                const data = await res.json();
                if (data.plants && data.plants.length > 0) {
                    plants = data.plants;
                    savePlants();
                    refreshUI();
                } else if (plants.length > 0) {
                    // Server empty, push local cache up
                    for (const p of plants) {
                        await apiPost('/api/plants', { id: p.id, name: p.name, created_at: p.created_at });
                        for (const e of (p.entries || [])) {
                            await apiPost('/api/entries', { plant_id: p.id, entry: e });
                        }
                    }
                }
            } catch (e) { console.warn('server sync unavailable, using local cache'); }
        }

        function savePlants() {
            localStorage.setItem('miCultivoPlants', JSON.stringify(plants));
        }

        function createPlant() {
            const name = document.getElementById('plantNameInput').value.trim();
            if (!name) return;
            const plant = { id: 'plant_' + Date.now(), name, created_at: new Date().toISOString(), entries: [] };
            plants.push(plant);
            savePlants();
            apiPost('/api/plants', { id: plant.id, name: plant.name, created_at: plant.created_at });
            currentPlantId = plant.id;
            document.getElementById('onboardingCard').style.display = 'none';
            document.getElementById('plantSelectorCard').style.display = 'block';
            document.getElementById('uploadCard').style.display = 'block';
            renderPlantSelector();
            document.getElementById('plantSelector').value = currentPlantId;
            updatePlantInfo();
        }

        function showAddPlant() {
            const name = prompt('Nombre de tu nueva planta:');
            if (!name) return;
            const plant = { id: 'plant_' + Date.now(), name, created_at: new Date().toISOString(), entries: [] };
            plants.push(plant);
            savePlants();
            apiPost('/api/plants', { id: plant.id, name: plant.name, created_at: plant.created_at });
            currentPlantId = plant.id;
            renderPlantSelector();
            document.getElementById('plantSelector').value = currentPlantId;
            updatePlantInfo();
        }

        function renderPlantSelector() {
            const sel = document.getElementById('plantSelector');
            sel.innerHTML = plants.map(p => '<option value="' + p.id + '">' + p.name + '</option>').join('');
        }

        function switchPlant(id) {
            currentPlantId = id;
            updatePlantInfo();
        }

        function getCurrentPlant() {
            return plants.find(p => p.id === currentPlantId);
        }

        function updatePlantInfo() {
            const plant = getCurrentPlant();
            if (!plant) return;
            const last = plant.entries.length > 0 ? plant.entries[plant.entries.length - 1] : null;
            let info = 'Aquí desde ' + new Date(plant.created_at).toLocaleDateString();
            if (last) {
                const days = Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000);
                info += ' · Última revisión: ' + (days === 0 ? 'hoy' : 'hace ' + days + ' días');
                info += ' · ' + plant.entries.length + ' revisión(es)';
            } else {
                info += ' · Sin revisiones aún';
            }
            document.getElementById('plantInfo').textContent = info;
        }

        function addEntry(leafCount, lesionCount, response) {
            const plant = getCurrentPlant();
            if (!plant) return;
            const prev = plant.entries.length > 0 ? plant.entries[plant.entries.length - 1] : null;
            const entry = { date: new Date().toISOString(), leaf_count: leafCount, lesion_count: lesionCount, response };
            plant.entries.push(entry);
            // Cap journal at 50 entries to avoid unbounded localStorage growth
            if (plant.entries.length > 50) plant.entries = plant.entries.slice(-50);
            savePlants();
            apiPost('/api/entries', { plant_id: plant.id, entry });
            updatePlantInfo();
            // Show comparison
            if (prev) {
                const leafDiff = leafCount - prev.leaf_count;
                const lesionDiff = lesionCount - prev.lesion_count;
                let cmp = '';
                if (leafDiff > 0) cmp += 'Hojas: +' + leafDiff + ' (¡creciendo!) ';
                else if (leafDiff < 0) cmp += 'Hojas: ' + leafDiff + ' (menos) ';
                else cmp += 'Hojas: igual (' + leafCount + ') ';
                if (lesionDiff > 0) cmp += '· Manchas: +' + lesionDiff + ' (nuevas) ';
                else if (lesionDiff < 0) cmp += '· Manchas: ' + lesionDiff + ' (mejorando) ';
                else cmp += '· Manchas: igual (' + lesionCount + ') ';
                const cmpEl = document.createElement('div');
                cmpEl.className = 'dynamic-note';
                cmpEl.style.cssText = 'background:rgba(76,175,80,0.15);padding:0.6rem;border-radius:8px;margin-top:0.6rem;font-size:0.85rem;';
                cmpEl.textContent = cmp;
                document.getElementById('response').appendChild(cmpEl);
            }
            // Check-in reminder
            const reminder = document.createElement('div');
            reminder.className = 'dynamic-note';
            reminder.style.cssText = 'background:rgba(255,193,7,0.15);padding:0.6rem;border-radius:8px;margin-top:0.6rem;font-size:0.85rem;';
            reminder.textContent = '📸 Manda otra foto en 2-3 días para ver cómo avanza.';
            document.getElementById('response').appendChild(reminder);
        }

        // Load plants on startup
        loadPlants();


        function previewPhoto(input) {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                if (!file.type.startsWith('image/')) {
                    alert('Elige un archivo de imagen (JPG/PNG).');
                    input.value = '';
                    return;
                }
                if (file.size > 8 * 1024 * 1024) {
                    alert('La foto es muy grande (máx 8MB). Elige una más pequeña.');
                    input.value = '';
                    return;
                }
                selectedFile = file;
                const reader = new FileReader();
                reader.onload = e => {
                    const img = document.getElementById('preview');
                    img.src = e.target.result;
                    img.style.display = 'block';
                    document.getElementById('uploadIcon').style.display = 'none';
                    document.getElementById('uploadText').textContent = 'Foto lista ✓';
                };
                reader.onerror = () => alert('No se pudo leer ese archivo. Prueba con otra foto.');
                reader.readAsDataURL(selectedFile);
                document.getElementById('sendBtn').disabled = false;
            }
        }

        function compressImage(file, maxWidth, quality) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
                reader.onload = e => {
                    const img = new Image();
                    img.onerror = () => reject(new Error('Archivo de imagen inválido'));
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width, h = img.height;
                        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
                        canvas.width = w; canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        canvas.toBlob(blob => {
                            if (blob) resolve(blob);
                            else reject(new Error('Falló la compresión de la imagen'));
                        }, 'image/jpeg', quality);
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        }

        async function sendPhoto() {
            if (!selectedFile) return;
            const btn = document.getElementById('sendBtn');
            btn.disabled = true;
            document.getElementById('loading').style.display = 'block';
            const responseBox = document.getElementById('response');
            responseBox.style.display = 'none';
            // Clear dynamic notes from previous analysis
            responseBox.querySelectorAll('.dynamic-note').forEach(el => el.remove());

            try {
                let uploadBlob;
                try {
                    uploadBlob = await compressImage(selectedFile, 1200, 0.8);
                } catch (e) {
                    console.warn('Compresión falló, subiendo original:', e);
                    uploadBlob = selectedFile;
                }
                const formData = new FormData();
                formData.append('photo', uploadBlob, selectedFile.name);

                const res = await fetch('/analyze', { method: 'POST', body: formData });
                const contentType = res.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    throw new Error('El servidor está despertando. Espera unos segundos e intenta de nuevo.');
                }
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.response || 'Falló el análisis. Intenta de nuevo.');
                }
                if (!data.response) {
                    throw new Error('Sin respuesta. Intenta de nuevo.');
                }
                document.getElementById('responseText').textContent = data.response;
                responseBox.style.display = 'block';
                // Play server-generated voice note if available, else browser TTS fallback
                const audioPlayer = document.getElementById('audioPlayer');
                if (data.audio_url) {
                    audioPlayer.src = data.audio_url;
                    audioPlayer.style.display = 'block';
                    audioPlayer.play().catch(() => {});
                } else if ('speechSynthesis' in window) {
                    try {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(data.response);
                        utterance.lang = 'es-MX';
                        utterance.rate = 0.9;
                        window.speechSynthesis.speak(utterance);
                    } catch (e) {
                        console.error('TTS error:', e);
                    }
                }
                // Save entry to plant journal
                addEntry(data.leaf_count || 0, data.lesion_count || 0, data.response);
                const now = new Date().toLocaleString();
                const item = document.createElement('div');
                item.className = 'history-item';
                const dateSpan = document.createElement('span');
                dateSpan.className = 'date';
                dateSpan.textContent = now;
                item.appendChild(dateSpan);
                item.appendChild(document.createElement('br'));
                item.appendChild(document.createTextNode(data.response.substring(0, 80) + '...'));
                document.getElementById('historyList').prepend(item);
                document.getElementById('historySection').style.display = 'block';
            } catch (e) {
                document.getElementById('responseText').textContent = 'Error: ' + (e.message || 'Unknown error') + '. Intenta de nuevo.';
                responseBox.style.display = 'block';
                console.error('Analyze error:', e);
            } finally {
                document.getElementById('loading').style.display = 'none';
                btn.disabled = false;
            }
        }
    </script>
</body>
</html>`;

// Journal: one Durable Object instance per device, SQLite-backed.
// Survives deploys and works from any browser where the user opens the app.
export class JournalStore {
    constructor(state) {
        this.sql = state.storage.sql;
        this.sql.exec(`CREATE TABLE IF NOT EXISTS plants(id TEXT PRIMARY KEY, name TEXT, created_at TEXT)`);
        this.sql.exec(`CREATE TABLE IF NOT EXISTS entries(id INTEGER PRIMARY KEY AUTOINCREMENT, plant_id TEXT, date TEXT, leaf_count INTEGER, lesion_count INTEGER, response TEXT)`);
    }
    async fetch(request) {
        const url = new URL(request.url);
        if (request.method === "GET" && url.pathname.endsWith("/journal")) {
            const rows = [...this.sql.exec(`SELECT id, name, created_at FROM plants ORDER BY created_at`)];
            const plants = rows.map(p => ({
                id: p.id, name: p.name, created_at: p.created_at,
                entries: [...this.sql.exec(`SELECT date, leaf_count, lesion_count, response FROM entries WHERE plant_id = ? ORDER BY id`, p.id)]
            }));
            return Response.json({ plants });
        }
        if (request.method === "POST" && url.pathname.endsWith("/plants")) {
            const b = await request.json().catch(() => ({}));
            if (!b.id || !b.name) return new Response("bad request", { status: 400 });
            this.sql.exec(`INSERT OR IGNORE INTO plants(id, name, created_at) VALUES (?, ?, ?)`, b.id, String(b.name).slice(0, 80), b.created_at || new Date().toISOString());
            return Response.json({ ok: true });
        }
        if (request.method === "POST" && url.pathname.endsWith("/entries")) {
            const b = await request.json().catch(() => ({}));
            if (!b.plant_id || !b.entry) return new Response("bad request", { status: 400 });
            const e = b.entry;
            this.sql.exec(`INSERT INTO entries(plant_id, date, leaf_count, lesion_count, response) VALUES (?, ?, ?, ?, ?)`,
                b.plant_id, e.date || new Date().toISOString(), e.leaf_count | 0, e.lesion_count | 0, String(e.response || "").slice(0, 2000));
            // Cap per-plant history server-side too
            this.sql.exec(`DELETE FROM entries WHERE id IN (SELECT id FROM entries WHERE plant_id = ? ORDER BY id DESC LIMIT -1 OFFSET 50)`, b.plant_id);
            return Response.json({ ok: true });
        }
        return new Response("not found", { status: 404 });
    }
}

// Global rate limiter: 20 analyze calls per IP per hour (protects API credits)
export class RateLimit {
    constructor(state) {
        this.sql = state.storage.sql;
        this.sql.exec(`CREATE TABLE IF NOT EXISTS hits(key TEXT, ts INTEGER)`);
        this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_hits ON hits(key, ts)`);
    }
    async fetch(request) {
        const { key, limit = 20, window = 3600 } = await request.json().catch(() => ({}));
        const now = Math.floor(Date.now() / 1000);
        this.sql.exec(`DELETE FROM hits WHERE ts < ?`, now - window);
        const row = [...this.sql.exec(`SELECT COUNT(*) AS n FROM hits WHERE key = ?`, String(key))][0];
        if (row.n >= limit) return new Response(JSON.stringify({ ok: false }), { status: 429 });
        this.sql.exec(`INSERT INTO hits(key, ts) VALUES (?, ?)`, String(key), now);
        return Response.json({ ok: true, remaining: limit - row.n - 1 });
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        // Secrets: prefer wrangler secrets, fall back to built-in constants
        const META_KEY = (env && env.META_API_KEY) || META_API_KEY;
        const ELEVENLABS_KEY = (env && env.ELEVENLABS_API_KEY) || ELEVENLABS_API_KEY;

        // CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
        }

        // Health check
        if (url.pathname === "/health") {
            return new Response(JSON.stringify({ status: "ok", model: "muse-spark-1.3" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Journal API (server-side persistence per device)
        if (url.pathname === "/api/journal" && request.method === "GET") {
            const device = (url.searchParams.get("device") || "anon").slice(0, 64);
            const stub = env.JOURNAL.get(env.JOURNAL.idFromName("device-" + device));
            return stub.fetch(new Request("https://journal/journal", { method: "GET" }));
        }
        if ((url.pathname === "/api/plants" || url.pathname === "/api/entries") && request.method === "POST") {
            const raw = await request.text();
            let device = "anon";
            try { device = (JSON.parse(raw).device || "anon").slice(0, 64); } catch (e) {}
            const stub = env.JOURNAL.get(env.JOURNAL.idFromName("device-" + device));
            return stub.fetch(new Request("https://journal" + url.pathname, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: raw
            }));
        }

        // Analyze endpoint
        if (url.pathname === "/analyze" && request.method === "POST") {
            // Rate limit: 20 analyses per IP per hour (protects API credits)
            const ip = request.headers.get("CF-Connecting-IP") || "unknown";
            try {
                const rl = await env.LIMITER.get(env.LIMITER.idFromName("global")).fetch(
                    new Request("https://limiter/check", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ key: "analyze:" + ip, limit: 20, window: 3600 })
                    })
                );
                if (rl.status === 429) {
                    return new Response(JSON.stringify({
                        status: "error",
                        response: "Límite alcanzado: 20 análisis por hora. Intenta más tarde."
                    }), { status: 429, headers: { "Content-Type": "application/json" } });
                }
            } catch (e) { console.error("rate-limit check failed (allowing):", e.message); }
            try {
                const formData = await request.formData();
                const photo = formData.get("photo");
                if (!photo || typeof photo === "string") {
                    return new Response(JSON.stringify({ error: "No photo provided" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }
                // Validate upload: images only, max 8MB (Workers + base64 overhead)
                if (photo.type && !photo.type.startsWith("image/")) {
                    return new Response(JSON.stringify({ status: "error", response: "Sube un archivo de imagen (JPG/PNG)." }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }
                if (photo.size > 8 * 1024 * 1024) {
                    return new Response(JSON.stringify({ status: "error", response: "La foto es muy grande (máx 8MB). Usa una imagen más pequeña." }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                // Read image bytes
                const imageBytes = await photo.arrayBuffer();
                // Chunked base64 encoding to avoid stack overflow
                const uint8 = new Uint8Array(imageBytes);
                let binary = '';
                const chunkSize = 8192;
                for (let i = 0; i < uint8.length; i += chunkSize) {
                    const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
                    binary += String.fromCharCode.apply(null, chunk);
                }
                const base64Image = btoa(binary);

                // Step 1: SAM 3.1 segmentation (both prompts in parallel — halves latency)
                async function countInstances(concept) {
                    try {
                        const samResponse = await fetch("https://api.meta.ai/v1/responses", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${META_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                model: "sam-3.1",
                                input: [{
                                    role: "user",
                                    content: [
                                        { type: "input_text", text: concept },
                                        { type: "input_image", image_url: `data:image/jpeg;base64,${base64Image}` }
                                    ]
                                }]
                            })
                        });
                        if (!samResponse.ok) {
                            console.error(`SAM "${concept}" HTTP ${samResponse.status}`);
                            return 0;
                        }
                        const samData = await samResponse.json();
                        let samText = "";
                        for (const item of (samData.output || [])) {
                            for (const c of (item.content || [])) {
                                samText += c.text || "";
                            }
                        }
                        return (samText.match(/<\|box;/g) || []).length;
                    } catch (e) {
                        console.error(`SAM "${concept}" error:`, e.message);
                        return 0;
                    }
                }
                const [leafCount, lesionCount] = await Promise.all([
                    countInstances("leaf"),
                    countInstances("lesion")
                ]);

                // Step 2: Visual analysis with Muse Spark
                const analysisResponse = await fetch("https://api.meta.ai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${META_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "muse-spark-1.3",
                        messages: [{
                            role: "user",
                            content: [
                                { type: "text", text: "Analiza esta foto de una planta. Describe lo que ves: color de hojas, manchas, frutos, crecimiento. Responde en 2-3 oraciones." },
                                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                            ]
                        }]
                    })
                });
                if (!analysisResponse.ok) {
                    console.error("Analysis HTTP", analysisResponse.status);
                }
                const analysisData = analysisResponse.ok ? await analysisResponse.json() : {};
                const analysis = analysisData.choices?.[0]?.message?.content || "Sin análisis disponible.";

                // Step 3: Agent response
                const measText = `SAM 3.1 found ${leafCount} leaf instance(s) and ${lesionCount} lesion(s).`;
                const agentResponse = await fetch("https://api.meta.ai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${META_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "muse-spark-1.3",
                        messages: [
                            {
                                role: "system",
                                content: "Eres una planta. Hablas en primera persona, con voz cálida y cercana. No eres un asistente genérico: ERES la planta de quien te cuida. Recibes mediciones del análisis de imagen. Compara las mediciones actuales con anteriores para detectar cambios. Orienta con nivel de confianza, nunca des un diagnóstico cerrado. Nunca indiques dosis de agroquímicos. Si no sabes algo, dilo con honestidad. Tus respuestas son cortas: 2-4 oraciones, como una nota de voz. Habla como una planta normal, no como científica. Evita tecnicismos. No menciones modelos ni algoritmos. No asumas que eres un tomate: eres la planta que el usuario tenga. Responde siempre en español."
                            },
                            {
                                role: "user",
                                content: `Encontré ${leafCount} hojas y ${lesionCount} manchas. Esto es lo que veo: ${analysis}. Responde como la planta, con las mediciones pero en lenguaje simple, de todos los días.`
                            }
                        ]
                    })
                });
                if (!agentResponse.ok) {
                    console.error("Agent HTTP", agentResponse.status);
                }
                const agentData = agentResponse.ok ? await agentResponse.json() : {};
                const responseText = agentData.choices?.[0]?.message?.content || "Mmm, ahora mismo no sé qué decir.";

                // Step 4: TTS with ElevenLabs
                let audioUrl = null;
                try {
                    const ttsResponse = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
                        method: "POST",
                        headers: {
                            "xi-api-key": ELEVENLABS_KEY,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            text: responseText,
                            model_id: "eleven_multilingual_v2",
                            voice_settings: {
                                stability: 0.5,
                                similarity_boost: 0.75,
                                style: 0.3,
                                use_speaker_boost: true
                            }
                        })
                    });
                    if (ttsResponse.ok) {
                        const audioBuffer = await ttsResponse.arrayBuffer();
                        // Skip embedding huge audio in JSON (>1.5MB): frontend falls back to browser TTS
                        if (audioBuffer.byteLength > 1536 * 1024) {
                            console.log("TTS audio too large to embed, using browser fallback:", audioBuffer.byteLength);
                        } else {
                            console.log("TTS OK, size:", audioBuffer.byteLength);
                        const audioUint8 = new Uint8Array(audioBuffer);
                        let audioBinary = '';
                        const audioChunkSize = 8192;
                        for (let i = 0; i < audioUint8.length; i += audioChunkSize) {
                            const chunk = audioUint8.subarray(i, Math.min(i + audioChunkSize, audioUint8.length));
                            audioBinary += String.fromCharCode.apply(null, chunk);
                        }
                        const audioBase64 = btoa(audioBinary);
                        audioUrl = 'data:audio/mpeg;base64,' + audioBase64;
                        console.log("Audio URL length:", audioUrl.length);
                        }
                    } else {
                        const errText = await ttsResponse.text();
                        console.error("TTS failed:", ttsResponse.status, errText.substring(0, 200));
                    }
                } catch (e) {
                    console.error("TTS error:", e);
                }

                return new Response(JSON.stringify({
                    status: "ok",
                    response: responseText,
                    audio_url: audioUrl,
                    leaf_count: leafCount,
                    lesion_count: lesionCount
                }), {
                    headers: { "Content-Type": "application/json" }
                });

            } catch (error) {
                console.error("Analyze error:", error);
                return new Response(JSON.stringify({
                    status: "error",
                    response: "Ups, algo salió mal. Intenta de nuevo.",
                    error: error.message
                }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        // Serve static HTML
        return new Response(HTML, {
            headers: { "Content-Type": "text/html" }
        });
    }
};