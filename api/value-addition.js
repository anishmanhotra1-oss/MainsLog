/**
 * Serverless Backend Route: /api/value-addition
 * Powered by Google Gemini API (generateContent)
 * Generates authentic, government-sourced UPSC Value Additions & Multi-Tier Case Studies
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

CRITICAL RULES FOR HIGH MARKS:
1. Ground all data in authentic, specific Indian government sources: NFHS-5, PLFS 2023-24, MoSPI, NITI Aayog Strategy @75, Economic Survey, NCRB, RBI, 10th Agricultural Census, or relevant Ministry annual reports with exact figures.
2. PROVIDE MULTIPLE RICH CASE STUDIES (At least 2-3 distinct case studies per category):
   - ruralCase: Provide at least 2-3 distinct Grassroots & Rural Indian Case Studies (format: "• Case 1 [Location, State]: Mechanism & measurable impact\n• Case 2 [Location, State]: Mechanism & measurable impact").
   - adminCase: Provide 1-2 District Collector / Urban Governance / Administrative Innovations (format: "• Innovation 1 [District/City, State]: Leadership initiative & systemic outcome").
   - globalCase: Provide at least 2 distinct International Benchmark Case Studies from different countries (format: "• Benchmark 1 [Country]: Specific policy mechanism & result\n• Benchmark 2 [Country]: Specific policy mechanism & result").
3. Thinkers must be legitimate academic authorities (Amartya Sen, Elinor Ostrom, Bina Agarwal, M.N. Srinivas, Andre Beteille, Ulrich Beck, John Rawls, etc.) with their concepts applied directly to this topic.
4. Committee recommendations must cite real high-level committees (Ashok Dalwai, Punchhi, Sarkaria, Shanta Kumar, Kasturirangan, Shekatkar, etc.).
5. Commission reports must cite 2nd ARC (specify report number), Law Commission (specify report number), or Finance Commission.
6. The "edge" factor MUST explain the subtle institutional paradox or policy blind spot that average aspirants miss, and the concrete structural reform used by toppers (AIR 1-20) to score maximum marks.
7. Output MUST be valid JSON adhering strictly to the requested schema.`;

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
    adminCase: { type: "STRING" },
    globalCase: { type: "STRING" },
    committee: { type: "STRING" },
    commission: { type: "STRING" },
    laws: { type: "STRING" },
    schemes: { type: "STRING" },
    edge: { type: "STRING" }
  },
  required: [
    "title", "category", "data", "dataSource", "quote", "quoteSource",
    "thinker", "examples", "ruralCase", "adminCase", "globalCase", "committee",
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
Generate the full 12-dimension Topper Value Addition Dossier for UPSC Mains for this specific topic.
CRITICAL: Include multiple distinct, high-impact case studies for:
- ruralCase (2-3 distinct rural Indian grassroots/panchayat cases with location and outcome)
- adminCase (1-2 district collector or municipal administrative innovations)
- globalCase (2 distinct international policy benchmarks with country and lesson)
Ground every single point in authentic Indian governance, official statistics, and scholarship. Return valid JSON only.`;

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
