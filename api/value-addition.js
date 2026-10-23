/**
 * Serverless Backend Route: /api/value-addition
 * Powered by Google Gemini API (generateContent)
 * Generates authentic, government-sourced UPSC Value Additions & Edge Factors
 */

const fs = require('fs');
const path = require('path');

// Auto-load .env file into process.env if present
function ensureEnvLoaded() {
  if (process.env.GEMINI_API_KEY) return;
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    try {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const k = trimmed.slice(0, eqIdx).trim();
            const v = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[k]) process.env[k] = v;
          }
        }
      }
    } catch (e) {
      console.warn('[VA-API] Failed to parse .env:', e.message);
    }
  }
}
ensureEnvLoaded();

const SYSTEM_PROMPT = `You are an elite UPSC Civil Services Examination (CSE) Mains mentor and top evaluator for General Studies (GS 1, 2, 3, 4, Essay) and Sociology Optional.
Your goal is to supply authentic, distinct, highly specific value additions and non-cliché scoring frameworks for any given topic.
CRITICAL RULES:
1. Ground all data in authentic, specific Indian government sources: NFHS-5, PLFS 2023-24, MoSPI, NITI Aayog Strategy @75, Economic Survey, NCRB, RBI, 10th Agricultural Census, or relevant Ministry annual reports.
2. Provide exact numbers/percentages where applicable (do NOT say "a significant percentage" or "many people").
3. Thinkers must be legitimate academic authorities (Amartya Sen, Elinor Ostrom, Bina Agarwal, M.N. Srinivas, Andre Beteille, Ulrich Beck, John Rawls, etc.) with their concepts applied directly to this topic.
4. Rural case study must be a real Indian grassroots, panchayat, or district administration innovation (e.g. Hiware Bazar, Kudumbashree, Mendha Lekha, Tingvissing, Piplantri, Odanthurai).
5. Global case study must be a specific international benchmark (Singapore, Costa Rica, Rwanda, EU, Japan, etc.).
6. Committee recommendations must cite real high-level committees (Ashok Dalwai, Punchhi, Sarkaria, Shanta Kumar, Kasturirangan, Shekatkar, etc.).
7. Commission reports must cite 2nd ARC (specify report number), Law Commission (specify report number), or Finance Commission.
8. The "edge" factor MUST explain the subtle institutional paradox or policy blind spot that average aspirants miss, and the concrete structural reform used by toppers (AIR 1-20) to score maximum marks.
9. Output MUST be valid JSON adhering strictly to the requested schema.`;

const VA_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    category: { type: "STRING" },
    data: { type: "STRING" },
    dataSource: { type: "STRING" },
    quote: { type: "STRING" },
    quoteSource: { type: "STRING" },
    thinker: { type: "STRING" },
    examples: { type: "STRING" },
    ruralCase: { type: "STRING" },
    globalCase: { type: "STRING" },
    committee: { type: "STRING" },
    commission: { type: "STRING" },
    laws: { type: "STRING" },
    schemes: { type: "STRING" },
    edge: { type: "STRING" }
  },
  required: [
    "title", "category", "data", "dataSource", "quote", "quoteSource",
    "thinker", "examples", "ruralCase", "globalCase", "committee",
    "commission", "laws", "schemes", "edge"
  ]
};

module.exports = async function valueAdditionHandler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  ensureEnvLoaded();

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {}
  }

  const topic = (body.topic || '').trim();
  if (!topic) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Topic is required.' }));
    return;
  }

  const apiKey = body.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: 'GEMINI_API_KEY is not configured in .env or request.'
    }));
    return;
  }

  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash'
  ];

  const userPrompt = `Topic: "${topic}"
Generate the full 11-dimension Topper Value Addition Dossier for UPSC Mains for this specific topic. Every point must be concrete, authoritative, and grounded in Indian governance and scholarship. Return valid JSON only.`;

  let lastError = null;
  for (const modelName of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const payload = {
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: VA_RESPONSE_SCHEMA
        }
      };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.warn(`[VA-API] Model ${modelName} returned status ${resp.status}:`, errorText.slice(0, 160));
        lastError = new Error(`Gemini API error (${modelName}) [${resp.status}]: ${errorText}`);
        continue;
      }

      const json = await resp.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(rawText);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        data: parsed,
        modelUsed: modelName
      }));
      return;
    } catch (err) {
      console.warn(`[VA-API] Call with ${modelName} failed:`, err.message);
      lastError = err;
    }
  }

  res.statusCode = 502;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    success: false,
    error: lastError ? lastError.message : 'All candidate Gemini models failed to process the topic.'
  }));
};
