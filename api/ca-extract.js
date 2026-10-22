/**
 * Serverless Backend Route: /api/ca-extract
 * Powered by Google Gemini Multimodal API (generateContent)
 * 
 * Features:
 * 1. Strict server-side GEMINI_API_KEY security.
 * 2. Two-Pass Pipeline with Automatic Fallback:
 *    - PASS A (Detection): Identifies marked regions and flags handwriting density.
 *    - PASS B (Transcription & Verification): Transcribes exact text, assigns headings & sections.
 *    - Fall-through: If Pass A encounters any API error, automatically falls through to Pass B
 *      so that marked notes are never missed or dropped.
 * 3. Resilient Multimodal Model Fallback Chain:
 *    - Automatically handles model availability (gemini-3.5-flash -> gemini-3.6-flash -> gemini-3.5-flash-lite).
 * 4. Few-Shot In-Context Learning turns from examples.json.
 * 5. Native JSON responseSchema enforcement with temperature 0.
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
      console.warn('[CA-EXTRACT] Failed to parse .env:', e.message);
    }
  }
}
ensureEnvLoaded();

// Response Schema for Pass B / Complete Extraction
const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    page_number: { type: "INTEGER" },
    magazine_title: { type: "STRING" },
    issue: { type: "STRING" },
    articles: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          heading: { type: "STRING" },
          section: {
            type: "STRING",
            enum: [
              "Polity",
              "Economy",
              "IR",
              "Environment",
              "Sci-Tech",
              "Geography",
              "Culture",
              "Social",
              "Defence",
              "Misc"
            ]
          },
          items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                type: {
                  type: "STRING",
                  enum: [
                    "highlight",
                    "underline",
                    "handwritten",
                    "boxed",
                    "map",
                    "diagram",
                    "table"
                  ]
                },
                color: { type: "STRING" },
                text: { type: "STRING" },
                note_attached_to: { type: "STRING" },
                box_2d: {
                  type: "ARRAY",
                  items: { type: "INTEGER" }
                },
                confidence: { type: "NUMBER" }
              },
              required: ["type", "text"]
            }
          }
        },
        required: ["heading", "section", "items"]
      }
    },
    visual_assets: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING" },
          caption: { type: "STRING" },
          labels: {
            type: "ARRAY",
            items: { type: "STRING" }
          },
          box_2d: {
            type: "ARRAY",
            items: { type: "INTEGER" }
          }
        }
      }
    },
    takeaway: { type: "STRING" }
  },
  required: ["articles"]
};

// Response Schema for Pass A (Detection)
const GEMINI_DETECT_SCHEMA = {
  type: "OBJECT",
  properties: {
    marked_regions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: {
            type: "STRING",
            enum: [
              "highlight",
              "underline",
              "handwritten",
              "boxed",
              "map",
              "diagram",
              "table"
            ]
          },
          color: { type: "STRING" },
          box_2d: {
            type: "ARRAY",
            items: { type: "INTEGER" }
          },
          short_hint: { type: "STRING" }
        },
        required: ["type", "box_2d"]
      }
    },
    is_handwriting_heavy: { type: "BOOLEAN" }
  },
  required: ["marked_regions"]
};

// System Prompt for Gemini
const SYSTEM_PROMPT = `You are an exact transcriber, not a summarizer. This is ONE page of a Current Affairs magazine marked by a student with pens and highlighters. EXTRACT only what the student marked: highlight = coloured fill behind text (state the colour: yellow, green, pink, blue, orange, purple); underline = a pen or pencil line below text; boxed = a box or circle around text; handwritten = anything the student wrote by hand, including margin notes; map/diagram/table = only if highlighted, circled or annotated. IGNORE every piece of unmarked printed text. Do not summarize. Copy printed words exactly. Transcribe handwriting faithfully and write [illegible] for unreadable words. Never invent or add facts. If nothing is marked, return empty arrays. Assign each item to the nearest printed article heading above it; if the heading is on a previous page use 'Continued from previous page'. Bounding box coordinates box_2d are [ymin, xmin, ymax, xmax] on a 0-1000 normalized scale. Return ONLY JSON matching the schema.`;

// Load few-shot examples from file system if available
function loadFewShotExamples() {
  const possiblePaths = [
    path.join(__dirname, '../features/ca-notes/examples/examples.json'),
    path.join(__dirname, '../features/current-affairs-notes/examples/examples.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (e) {
        console.warn('[CA-EXTRACT] Failed to load few-shot examples:', e.message);
      }
    }
  }
  return [];
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }));
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
        return;
      }
    }

    if (!body || !body.page_image) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Missing page_image in request body' }));
      return;
    }

    const pageNumber = parseInt(body.page_number, 10) || 1;
    let base64Data = body.page_image;
    let mimeType = 'image/jpeg';

    if (base64Data.startsWith('data:')) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    // Configurable Gemini API Key & Model Tiers
    ensureEnvLoaded();
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const flashModel = process.env.GEMINI_FLASH_MODEL || 'gemini-3.5-flash';
    const proModel = process.env.GEMINI_PRO_MODEL || 'gemini-3.5-flash';

    // Demo Mode if API Key is not set in environment
    if (!apiKey) {
      console.warn('[CA-EXTRACT] GEMINI_API_KEY not found in environment. Providing demonstration response.');
      const demoResult = {
        page_number: pageNumber,
        magazine_title: body.magazine_meta?.title || 'Current Affairs Magazine',
        issue: body.magazine_meta?.issue || 'Monthly Dossier',
        articles: [
          {
            heading: 'Key Current Affairs Highlight (Gemini API Key Required)',
            section: 'Polity',
            items: [
              {
                type: 'highlight',
                color: 'yellow',
                text: 'Set GEMINI_API_KEY in your environment to activate Google Gemini Vision two-pass extraction.',
                note_attached_to: null,
                box_2d: [150, 80, 210, 920],
                confidence: 0.99
              },
              {
                type: 'handwritten',
                color: 'blue',
                text: 'High-Yield GS-2 Note: Double-pass extraction separates handwriting detection from verbatim transcription.',
                note_attached_to: 'Standing Deposit Facility',
                box_2d: [240, 80, 290, 850],
                confidence: 0.96
              }
            ]
          }
        ],
        visual_assets: [
          {
            type: 'diagram',
            caption: 'Annotated policy corridor architecture.',
            labels: ['MSF Ceiling', 'Repo Benchmark', 'SDF Floor'],
            box_2d: [320, 100, 600, 880]
          }
        ],
        takeaway: 'Demo mode active. Add GEMINI_API_KEY to your environment or .env file for live Google Gemini processing.'
      };

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        data: demoResult,
        warning: 'GEMINI_API_KEY not configured. Returned structured demonstration result.'
      }));
      return;
    }

    // Robust Multi-Model Fallback Caller
    async function callGemini(contents, schema, customSystem = SYSTEM_PROMPT, preferredModel = null) {
      const candidateModels = [];
      if (preferredModel) candidateModels.push(preferredModel);
      if (flashModel && !candidateModels.includes(flashModel)) candidateModels.push(flashModel);
      if (!candidateModels.includes('gemini-3.5-flash')) candidateModels.push('gemini-3.5-flash');
      if (!candidateModels.includes('gemini-3.6-flash')) candidateModels.push('gemini-3.6-flash');
      if (!candidateModels.includes('gemini-3.5-flash-lite')) candidateModels.push('gemini-3.5-flash-lite');

      let lastError = null;
      for (const modelName of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          const payload = {
            systemInstruction: {
              parts: [{ text: customSystem }]
            },
            contents: contents,
            generationConfig: {
              temperature: 0,
              responseMimeType: 'application/json',
              responseSchema: schema
            }
          };

          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!resp.ok) {
            const errorText = await resp.text();
            console.warn(`[CA-EXTRACT] Model ${modelName} returned status ${resp.status}:`, errorText.slice(0, 160));
            lastError = new Error(`Gemini API error (${modelName}) [${resp.status}]: ${errorText}`);
            continue; // Fall through to next model
          }

          const json = await resp.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const parsed = JSON.parse(rawText);
          return { data: parsed, modelUsed: modelName };
        } catch (err) {
          console.warn(`[CA-EXTRACT] Call with ${modelName} encountered error:`, err.message);
          lastError = err;
        }
      }
      throw lastError || new Error('All candidate Gemini models failed.');
    }

    // -------------------------------------------------------------
    // PASS A: REGION DETECTION (Exhaustive Scan)
    // -------------------------------------------------------------
    let passAContents = [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `PASS A (DETECTION): Scan this magazine page for any student markings (highlighter strokes in yellow/green/pink/blue/orange, pen or pencil underlines, circled or boxed text, handwritten notes in margins, or annotated maps/diagrams). For every mark found, output its type, color, and approximate box_2d [ymin, xmin, ymax, xmax] (0-1000 scale). If the page has significant handwritten notes, set is_handwriting_heavy to true. If nothing is marked, return marked_regions as an empty array.`
          }
        ]
      }
    ];

    let detectedRegions = [];
    let isHandwritingHeavy = false;
    let passASucceeded = false;

    try {
      const passARes = await callGemini(
        passAContents,
        GEMINI_DETECT_SCHEMA,
        'You are an exhaustive region detector. Locate every single highlighter stroke, pen underline, circle, and handwritten note on the page.',
        flashModel
      );
      detectedRegions = passARes.data.marked_regions || [];
      isHandwritingHeavy = !!passARes.data.is_handwriting_heavy;
      passASucceeded = true;
      console.log(`[CA-EXTRACT] Page ${pageNumber}: Pass A detected ${detectedRegions.length} regions using ${passARes.modelUsed}.`);
    } catch (e) {
      console.warn('[CA-EXTRACT] Pass A detection warning, falling back directly to Pass B:', e.message);
    }

    // Fast Path: Only skip if Pass A genuinely succeeded AND confirmed 0 marks AND client has no HSV highlight hints
    const hasClientHints = Array.isArray(body.hints) && body.hints.length > 0;
    if (passASucceeded && detectedRegions.length === 0 && !hasClientHints) {
      const cleanResult = {
        page_number: pageNumber,
        magazine_title: body.magazine_meta?.title || 'Current Affairs Magazine',
        issue: body.magazine_meta?.issue || 'Monthly Dossier',
        articles: [],
        visual_assets: [],
        takeaway: 'No annotations or highlights found on this page.'
      };
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, data: cleanResult, model_used: 'none' }));
      return;
    }

    // Model routing: Choose Pro tier if configured for handwriting-heavy pages, otherwise Flash tier
    const activeModel = isHandwritingHeavy ? proModel : flashModel;

    // -------------------------------------------------------------
    // PASS B: TRANSCRIPTION & VERIFICATION (With Few-Shot In-Context Turns)
    // -------------------------------------------------------------
    const fewShotExamples = loadFewShotExamples();
    let passBContents = [];

    // Inject few-shot turns if present
    fewShotExamples.slice(0, 3).forEach(ex => {
      passBContents.push({
        role: 'user',
        parts: [{ text: ex.user_prompt }]
      });
      passBContents.push({
        role: 'model',
        parts: [{ text: JSON.stringify(ex.model_response) }]
      });
    });

    let passBPromptText = '';
    if (detectedRegions.length > 0) {
      const regionsSummary = detectedRegions
        .map((r, i) => `#${i + 1} Type: ${r.type}, Color: ${r.color || 'auto'}, Box: [${r.box_2d?.join(', ')}]`)
        .join('\n');

      passBPromptText = `PASS B (TRANSCRIBE & VERIFY): Here is the page image and detected marked regions from Pass A:\n${regionsSummary}\n\nTask: Transcribe the exact text for each marked region verbatim and assign it to its nearest printed article heading and section (Polity, Economy, IR, Environment, Sci-Tech, Geography, Culture, Social, Defence, Misc). Re-check the image for any additional markings that Pass A missed. Output valid JSON matching the schema.`;
    } else {
      passBPromptText = `PASS B (EXTRACTION): This page contains student annotations (highlighter fills in any color, pen/pencil underlines, handwritten margin notes, boxed text, or annotated maps/diagrams). Extract ONLY the student-marked items verbatim and assign each to its nearest article heading and syllabus section. Coordinates box_2d are [ymin, xmin, ymax, xmax] (0-1000 scale). Return valid JSON matching the schema.`;
    }

    passBContents.push({
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: passBPromptText }
      ]
    });

    const passBResult = await callGemini(passBContents, GEMINI_RESPONSE_SCHEMA, SYSTEM_PROMPT, activeModel);
    const finalResult = passBResult.data;

    // Ensure defaults
    if (!finalResult.page_number) finalResult.page_number = pageNumber;
    if (!Array.isArray(finalResult.articles)) finalResult.articles = [];
    if (!Array.isArray(finalResult.visual_assets)) finalResult.visual_assets = [];

    console.log(`[CA-EXTRACT] Page ${pageNumber}: Extracted ${finalResult.articles.reduce((acc, a) => acc + (a.items?.length || 0), 0)} items across ${finalResult.articles.length} articles using ${passBResult.modelUsed}.`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: finalResult, model_used: passBResult.modelUsed }));
  } catch (error) {
    console.error('[CA-EXTRACT] Gemini processing error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: error.message || 'Internal server error' }));
  }
};
