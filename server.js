const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png'
};

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tracker_progress.json');
const SYNC_FILE = path.join(DATA_DIR, 'app_sync.json');

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = { progress: {}, updatedAt: new Date().toISOString() };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readProgressData() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { progress: {}, updatedAt: new Date().toISOString() };
  }
}

function writeProgressData(data) {
  ensureStorage();
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

function readSyncData() {
  ensureStorage();
  if (!fs.existsSync(SYNC_FILE)) {
    return { ENTRIES: [], HABITS_LOG: {}, CUSTOM_HABITS: [], CONFIG: {}, timestamp: 0 };
  }
  try {
    return JSON.parse(fs.readFileSync(SYNC_FILE, 'utf-8'));
  } catch (e) {
    return { ENTRIES: [], HABITS_LOG: {}, CUSTOM_HABITS: [], CONFIG: {}, timestamp: 0 };
  }
}

function writeSyncData(data) {
  ensureStorage();
  data.timestamp = Date.now();
  fs.writeFileSync(SYNC_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', err => reject(err));
  });
}

function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  let reqPath = req.url.split('?')[0];

  // API Endpoints
  if (reqPath === '/api/sync') {
    if (req.method === 'GET') {
      const data = readSyncData();
      return sendJsonResponse(res, 200, data);
    }
    if (req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const existingData = readSyncData();
        const entryMap = new Map();
        (existingData.ENTRIES || []).forEach(e => { if (e && e.id) entryMap.set(e.id, e); });
        (body.ENTRIES || []).forEach(e => {
          if (e && e.id) {
            if (!entryMap.has(e.id)) {
              entryMap.set(e.id, e);
            } else {
              const oldItem = entryMap.get(e.id);
              entryMap.set(e.id, {
                ...oldItem,
                ...e
              });
            }
          }
        });

        const mergedEntries = Array.from(entryMap.values());
        const mergedHabits = { ...(existingData.HABITS_LOG || {}), ...(body.HABITS_LOG || {}) };
        
        let mergedTrackerProgress = existingData.TRACKER_PROGRESS || {};
        if (body.TRACKER_PROGRESS || body.progress) {
          const incomingProg = body.TRACKER_PROGRESS || body.progress;
          for (const d in incomingProg) {
            if (!mergedTrackerProgress[d]) mergedTrackerProgress[d] = { checks: {}, notes: {}, dates: {} };
            if (incomingProg[d].checks) mergedTrackerProgress[d].checks = { ...(mergedTrackerProgress[d].checks || {}), ...incomingProg[d].checks };
            if (incomingProg[d].notes) mergedTrackerProgress[d].notes = { ...(mergedTrackerProgress[d].notes || {}), ...incomingProg[d].notes };
            if (incomingProg[d].dates) mergedTrackerProgress[d].dates = { ...(mergedTrackerProgress[d].dates || {}), ...incomingProg[d].dates };
          }
        }

        const updated = {
          ...existingData,
          ...body,
          ENTRIES: mergedEntries,
          HABITS_LOG: mergedHabits,
          TRACKER_PROGRESS: mergedTrackerProgress
        };
        const saved = writeSyncData(updated);
        return sendJsonResponse(res, 200, { success: true, timestamp: saved.timestamp, data: saved });
      } catch (e) {
        return sendJsonResponse(res, 400, { success: false, error: 'Invalid JSON' });
      }
    }
  }

  if (reqPath.startsWith('/api/tracker/')) {
    if (reqPath === '/api/tracker/progress' && req.method === 'GET') {
      const data = readProgressData();
      return sendJsonResponse(res, 200, { success: true, progress: data.progress, updatedAt: data.updatedAt });
    }

    if (reqPath === '/api/tracker/update' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const { day, key, checked, note, progress } = body;
        const data = readProgressData();
        if (progress && typeof progress === 'object') {
          for (const d in progress) {
            if (!data.progress[d]) data.progress[d] = { checks: {}, notes: {}, dates: {}, timestamps: {} };
            if (progress[d].checks) data.progress[d].checks = { ...data.progress[d].checks, ...progress[d].checks };
            if (progress[d].notes) data.progress[d].notes = { ...data.progress[d].notes, ...progress[d].notes };
            if (progress[d].dates) data.progress[d].dates = { ...data.progress[d].dates, ...progress[d].dates };
          }
        }
        if (day && key) {
          if (!data.progress[day]) {
            data.progress[day] = { checks: {}, notes: {}, timestamps: {}, dates: {} };
          }
          if (!data.progress[day].checks) data.progress[day].checks = {};
          if (!data.progress[day].notes) data.progress[day].notes = {};
          if (!data.progress[day].timestamps) data.progress[day].timestamps = {};
          if (!data.progress[day].dates) data.progress[day].dates = {};

          if (typeof checked === 'boolean') {
            data.progress[day].checks[key] = checked;
            data.progress[day].timestamps[key] = new Date().toISOString();
            if (checked && !data.progress[day].dates[key]) {
              data.progress[day].dates[key] = new Date().toISOString().slice(0, 10);
            } else if (!checked) {
              delete data.progress[day].dates[key];
            }
          }
          if (typeof note === 'string') {
            data.progress[day].notes[key] = note;
          }
        }

        writeProgressData(data);
        return sendJsonResponse(res, 200, { success: true, progress: data.progress, updatedAt: data.updatedAt });
      } catch (err) {
        return sendJsonResponse(res, 400, { success: false, error: 'Invalid JSON body' });
      }
    }

    if (reqPath === '/api/tracker/reset' && req.method === 'POST') {
      const data = { progress: {} };
      writeProgressData(data);
      return sendJsonResponse(res, 200, { success: true, progress: {}, updatedAt: data.updatedAt });
    }

    if (reqPath === '/api/tracker/stats' && req.method === 'GET') {
      const data = readProgressData();
      return sendJsonResponse(res, 200, { success: true, progress: data.progress, updatedAt: data.updatedAt });
    }

    return sendJsonResponse(res, 404, { success: false, error: 'Endpoint not found' });
  }

  // Static File Serving
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/tracker') reqPath = '/tracker.html';

  const filePath = path.join(__dirname, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/ and http://127.0.0.1:${PORT}/`);
});

