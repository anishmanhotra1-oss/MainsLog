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

function parseTime(t) {
  if (!t) return 0;
  if (typeof t === 'number') return t;
  const parsed = new Date(t).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function mergeSingleEntry(oldItem, incomingItem) {
  if (!oldItem) return incomingItem;
  if (!incomingItem) return oldItem;

  const res = { ...oldItem, ...incomingItem };

  const milestones = ['r0', 'sunday', 'monthly', 'biMonthly'];
  milestones.forEach(m => {
    const doneKey = m === 'biMonthly' ? 'biMonthlyDone' : `${m}Done`;
    const timeKey = `${m}UpdatedAt`;

    const oldTime = parseTime(oldItem[timeKey] || oldItem.updatedAt);
    const incTime = parseTime(incomingItem[timeKey] || incomingItem.updatedAt);

    if (incTime >= oldTime) {
      res[doneKey] = incomingItem[doneKey] !== undefined ? incomingItem[doneKey] : oldItem[doneKey];
      res[timeKey] = incTime;
    } else {
      res[doneKey] = oldItem[doneKey] !== undefined ? oldItem[doneKey] : incomingItem[doneKey];
      res[timeKey] = oldTime;
    }
  });

  res.updatedAt = Math.max(parseTime(oldItem.updatedAt), parseTime(incomingItem.updatedAt), Date.now());
  return res;
}

function mergeTrackerProgress(localProg, serverProg) {
  let merged = {};
  if (localProg && typeof localProg === 'object') {
    try { merged = JSON.parse(JSON.stringify(localProg)); } catch(e){ merged = {}; }
  }
  if (!serverProg || typeof serverProg !== 'object') return merged;

  for (const day in serverProg) {
    if (!merged[day]) {
      merged[day] = JSON.parse(JSON.stringify(serverProg[day]));
      continue;
    }
    const sDay = serverProg[day];
    const mDay = merged[day];

    if (!mDay.checks) mDay.checks = {};
    if (!mDay.notes) mDay.notes = {};
    if (!mDay.dates) mDay.dates = {};
    if (!mDay.timestamps) mDay.timestamps = {};

    const sChecks = sDay.checks || {};
    const sNotes = sDay.notes || {};
    const sDates = sDay.dates || {};
    const sTimestamps = sDay.timestamps || {};

    for (const k in sChecks) {
      const localTime = parseTime(mDay.timestamps[k]);
      const serverTime = parseTime(sTimestamps[k]);

      if (serverTime >= localTime) {
        mDay.checks[k] = !!sChecks[k];
        if (serverTime > 0) mDay.timestamps[k] = serverTime;
        if (sChecks[k] && sDates[k]) {
          mDay.dates[k] = sDates[k];
        } else if (!sChecks[k]) {
          delete mDay.dates[k];
        }
      }
    }

    for (const k in sNotes) {
      if (sNotes[k] && !mDay.notes[k]) {
        mDay.notes[k] = sNotes[k];
      }
    }
  }
  return merged;
}

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

        if (body.resetAll) {
          const resetData = {
            ENTRIES: [],
            TRACKER_PROGRESS: {},
            HABITS_LOG: {},
            CUSTOM_HABITS: body.CUSTOM_HABITS || [],
            CONFIG: body.CONFIG || {},
            timestamp: Date.now()
          };
          const saved = writeSyncData(resetData);
          return sendJsonResponse(res, 200, { success: true, timestamp: saved.timestamp, data: saved });
        }

        const incomingEntries = body.ENTRIES || [];
        const deletedIds = new Set(body.deletedIds || []);

        const entryMap = new Map();
        (existingData.ENTRIES || []).forEach(e => {
          if (e && e.id && !deletedIds.has(e.id)) {
            entryMap.set(e.id, e);
          }
        });
        incomingEntries.forEach(e => {
          if (e && e.id && !deletedIds.has(e.id)) {
            if (!entryMap.has(e.id)) {
              entryMap.set(e.id, e);
            } else {
              const oldItem = entryMap.get(e.id);
              entryMap.set(e.id, mergeSingleEntry(oldItem, e));
            }
          }
        });

        const mergedEntries = Array.from(entryMap.values());
        const mergedHabits = { ...(existingData.HABITS_LOG || {}), ...(body.HABITS_LOG || {}) };
        const mergedTrackerProgress = mergeTrackerProgress(existingData.TRACKER_PROGRESS, body.TRACKER_PROGRESS || body.progress);

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
            const nowTime = body.timestamp || Date.now();
            data.progress[day].checks[key] = checked;
            data.progress[day].timestamps[key] = nowTime;
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

