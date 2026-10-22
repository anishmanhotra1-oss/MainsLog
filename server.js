const http = require('http');
const fs = require('fs');
const path = require('path');

// Auto-load .env file into process.env if present
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
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
  }
} catch (e) {}

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf'
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
  const syncData = readSyncData();
  return {
    progress: syncData.TRACKER_PROGRESS || {},
    updatedAt: new Date(syncData.timestamp || 0).toISOString()
  };
}

function writeProgressData(data) {
  const syncData = readSyncData();
  if (data.progress && typeof data.progress === 'object') {
    syncData.TRACKER_PROGRESS = mergeTrackerProgress(syncData.TRACKER_PROGRESS, data.progress);
  }
  const saved = writeSyncData(syncData);
  return {
    progress: saved.TRACKER_PROGRESS || {},
    updatedAt: new Date(saved.timestamp || 0).toISOString()
  };
}

function readSyncData() {
  ensureStorage();
  const defaultData = {
    ENTRIES: [],
    HABITS_LOG: {},
    CUSTOM_HABITS: [],
    CONFIG: {},
    SCORE_REGISTER: { gs: {}, csat: {} },
    PRELIMS_TARGETS_V1: [],
    TRACKER_PROGRESS: {},
    EB_ENTRIES: [],
    PYQ_USER_DATA: { bookmarks: [], bookmarkMeta: {}, attempted: [], attemptedMeta: {}, answers: {}, updatedAt: 0 },
    deletedScoreIds: [],
    deletedEntryIds: [],
    timestamp: 0
  };
  if (!fs.existsSync(SYNC_FILE)) {
    return defaultData;
  }
  try {
    const data = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf-8'));
    if (!Array.isArray(data.ENTRIES)) data.ENTRIES = [];
    if (!Array.isArray(data.PRELIMS_TARGETS_V1)) data.PRELIMS_TARGETS_V1 = [];
    if (!data.TRACKER_PROGRESS || typeof data.TRACKER_PROGRESS !== 'object') data.TRACKER_PROGRESS = {};
    if (!Array.isArray(data.EB_ENTRIES)) data.EB_ENTRIES = [];
    if (!data.PYQ_USER_DATA || typeof data.PYQ_USER_DATA !== 'object') {
      data.PYQ_USER_DATA = { bookmarks: [], bookmarkMeta: {}, attempted: [], attemptedMeta: {}, answers: {}, updatedAt: 0 };
    }
    if (!Array.isArray(data.deletedEntryIds)) data.deletedEntryIds = [];
    return data;
  } catch (e) {
    return defaultData;
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
      const sVal = !!sChecks[k];
      const mVal = !!mDay.checks[k];

      if (sVal) {
        mDay.checks[k] = true;
        if (serverTime > localTime) {
          mDay.timestamps[k] = serverTime;
        }
        if (sDates[k]) mDay.dates[k] = sDates[k];
      } else {
        if (mVal) {
          if (serverTime > localTime && serverTime > 0) {
            mDay.checks[k] = false;
            mDay.timestamps[k] = serverTime;
            delete mDay.dates[k];
          }
        } else {
          mDay.checks[k] = false;
        }
      }
    }

    for (const k in sNotes) {
      const localNoteTime = parseTime(mDay.timestamps[k + '_note'] || mDay.timestamps[k]);
      const serverNoteTime = parseTime(sTimestamps[k + '_note'] || sTimestamps[k]);
      if (serverNoteTime > localNoteTime || !mDay.notes[k]) {
        if (sNotes[k] !== undefined) {
          mDay.notes[k] = sNotes[k];
          if (serverNoteTime > 0) mDay.timestamps[k + '_note'] = serverNoteTime;
        }
      }
    }
  }
  return merged;
}

function mergeScoreRegister(existingScores, incomingScores, incomingDeletedScoreIds = [], existingDeletedScoreIds = []) {
  const delSet = new Set([...(incomingDeletedScoreIds || []), ...(existingDeletedScoreIds || [])]);
  const res = { gs: {}, csat: {} };
  const existing = existingScores || { gs: {}, csat: {} };
  const incoming = incomingScores || { gs: {}, csat: {} };

  const mergeSubObj = (oldObj, incObj, targetKey) => {
    const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(incObj || {})]);
    keys.forEach(k => {
      const oldArr = oldObj[k] || [];
      const incArr = incObj[k] || [];
      const map = new Map();

      oldArr.forEach(e => {
        if (e && e.id && !delSet.has(e.id)) map.set(e.id, e);
      });
      incArr.forEach(e => {
        if (e && e.id && !delSet.has(e.id)) {
          if (!map.has(e.id)) {
            map.set(e.id, e);
          } else {
            map.set(e.id, { ...map.get(e.id), ...e });
          }
        }
      });
      const mergedList = Array.from(map.values());
      mergedList.sort((a,b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return (a.order || 0) - (b.order || 0);
      });
      res[targetKey][k] = mergedList;
    });
  };

  mergeSubObj(existing.gs || {}, incoming.gs || {}, 'gs');
  mergeSubObj(existing.csat || {}, incoming.csat || {}, 'csat');
  return {
    mergedScores: res,
    deletedScoreIds: Array.from(delSet)
  };
}

function mergeEbEntries(existing, incoming) {
  const map = new Map();
  (existing || []).forEach(e => {
    if (e && e.id) map.set(e.id, e);
  });
  (incoming || []).forEach(e => {
    if (!e || !e.id) return;
    if (!map.has(e.id)) {
      map.set(e.id, e);
    } else {
      const old = map.get(e.id);
      const oldTime = parseTime(old.updated_at || old.created_at || old.updatedAt);
      const incTime = parseTime(e.updated_at || e.created_at || e.updatedAt);
      map.set(e.id, incTime >= oldTime ? { ...old, ...e } : { ...e, ...old });
    }
  });
  return Array.from(map.values()).sort((a, b) => parseTime(b.created_at || b.updated_at) - parseTime(a.created_at || a.updated_at));
}

function mergePyqUserData(existing, incoming) {
  const ex = existing || { bookmarks: [], bookmarkMeta: {}, attempted: [], attemptedMeta: {}, answers: {}, updatedAt: 0 };
  const inc = incoming || {};

  const exBmMeta = ex.bookmarkMeta || {};
  const incBmMeta = inc.bookmarkMeta || {};
  const mergedBmMeta = { ...exBmMeta };

  Object.keys(incBmMeta).forEach(qid => {
    const incItem = incBmMeta[qid];
    const exItem = mergedBmMeta[qid];
    if (!exItem) {
      mergedBmMeta[qid] = incItem;
    } else {
      const incT = parseTime(incItem.updatedAt || incItem.timestamp);
      const exT = parseTime(exItem.updatedAt || exItem.timestamp);
      mergedBmMeta[qid] = incT >= exT ? incItem : exItem;
    }
  });

  if (Array.isArray(inc.bookmarks)) {
    inc.bookmarks.forEach(qid => {
      if (!mergedBmMeta[qid]) {
        mergedBmMeta[qid] = { active: true, updatedAt: parseTime(inc.updatedAt) || Date.now() };
      }
    });
  }

  const exAttMeta = ex.attemptedMeta || {};
  const incAttMeta = inc.attemptedMeta || {};
  const mergedAttMeta = { ...exAttMeta };

  Object.keys(incAttMeta).forEach(qid => {
    const incItem = incAttMeta[qid];
    const exItem = mergedAttMeta[qid];
    if (!exItem) {
      mergedAttMeta[qid] = incItem;
    } else {
      const incT = parseTime(incItem.updatedAt || incItem.timestamp);
      const exT = parseTime(exItem.updatedAt || exItem.timestamp);
      mergedAttMeta[qid] = incT >= exT ? incItem : exItem;
    }
  });

  if (Array.isArray(inc.attempted)) {
    inc.attempted.forEach(qid => {
      if (!mergedAttMeta[qid]) {
        mergedAttMeta[qid] = { active: true, updatedAt: parseTime(inc.updatedAt) || Date.now() };
      }
    });
  }

  const bookmarks = Object.keys(mergedBmMeta).filter(k => mergedBmMeta[k] && mergedBmMeta[k].active !== false);
  const attempted = Object.keys(mergedAttMeta).filter(k => mergedAttMeta[k] && mergedAttMeta[k].active !== false);

  const answers = { ...(ex.answers || {}) };
  if (inc.answers && typeof inc.answers === 'object') {
    Object.keys(inc.answers).forEach(qid => {
      const incAns = inc.answers[qid];
      const exAns = answers[qid];
      if (!exAns) {
        answers[qid] = incAns;
      } else {
        const incT = parseTime(typeof incAns === 'object' ? (incAns.updatedAt || incAns.timestamp) : 0);
        const exT = parseTime(typeof exAns === 'object' ? (exAns.updatedAt || exAns.timestamp) : 0);
        answers[qid] = incT >= exT ? incAns : exAns;
      }
    });
  }

  const updatedAt = Math.max(parseTime(ex.updatedAt), parseTime(inc.updatedAt), Date.now());

  return {
    bookmarks,
    bookmarkMeta: mergedBmMeta,
    attempted,
    attemptedMeta: mergedAttMeta,
    answers,
    updatedAt
  };
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
            SCORE_REGISTER: { gs: {}, csat: {} },
            PRELIMS_TARGETS_V1: [],
            EB_ENTRIES: [],
            PYQ_USER_DATA: { bookmarks: [], bookmarkMeta: {}, attempted: [], attemptedMeta: {}, answers: {}, updatedAt: 0 },
            deletedScoreIds: [],
            deletedEntryIds: [],
            timestamp: Date.now()
          };
          const saved = writeSyncData(resetData);
          return sendJsonResponse(res, 200, { success: true, timestamp: saved.timestamp, data: saved });
        }

        function getRelatedIds(id) {
          if (!id) return [];
          const raw = String(id).trim();
          let clean = raw;
          let prev;
          do {
            prev = clean;
            clean = clean.replace(/^(plt_|entry_plt_|entry_|plt_entry_)/, '');
          } while (clean !== prev);

          if (!clean) return [raw];

          return Array.from(new Set([
            raw, clean,
            'plt_' + clean,
            'entry_' + clean,
            'entry_plt_' + clean,
            'entry_plt_plt_' + clean,
            'plt_entry_' + clean,
            'plt_entry_entry_plt_' + clean
          ]));
        }

        const incomingEntries = body.ENTRIES || [];
        const incomingDeletedEntryIds = body.deletedIds || body.deletedEntryIds || [];
        const rawDel = [
          ...(existingData.deletedEntryIds || []),
          ...(incomingDeletedEntryIds || [])
        ];
        const delEntrySet = new Set();
        rawDel.forEach(id => {
          getRelatedIds(id).forEach(rid => delEntrySet.add(rid));
        });

        const entryMap = new Map();
        (existingData.ENTRIES || []).forEach(e => {
          if (e && e.id && !delEntrySet.has(e.id)) {
            entryMap.set(e.id, e);
          }
        });
        incomingEntries.forEach(e => {
          if (e && e.id && !delEntrySet.has(e.id)) {
            if (!entryMap.has(e.id)) {
              entryMap.set(e.id, e);
            } else {
              const oldItem = entryMap.get(e.id);
              entryMap.set(e.id, mergeSingleEntry(oldItem, e));
            }
          }
        });

        // Prelims Targets merging with timestamp comparison
        let mergedPrelimsTargets = (existingData.PRELIMS_TARGETS_V1 || []).filter(t => {
          if (!t || !t.id) return false;
          const entryId = t.id.startsWith('entry_plt_') ? t.id : 'entry_plt_' + t.id;
          return !delEntrySet.has(t.id) && !delEntrySet.has(entryId);
        });
        if (Array.isArray(body.PRELIMS_TARGETS_V1)) {
          const pltMap = new Map();
          mergedPrelimsTargets.forEach(t => {
            if (t && t.id) pltMap.set(t.id, t);
          });
          body.PRELIMS_TARGETS_V1.forEach(t => {
            if (!t || !t.id) return;
            const entryId = t.id.startsWith('entry_plt_') ? t.id : 'entry_plt_' + t.id;
            if (delEntrySet.has(t.id) || delEntrySet.has(entryId)) return;
            if (!pltMap.has(t.id)) {
              pltMap.set(t.id, t);
            } else {
              const oldT = pltMap.get(t.id);
              const oldTime = parseTime(oldT.updatedAt || oldT.completedAt);
              const incTime = parseTime(t.updatedAt || t.completedAt);
              const isDone = incTime >= oldTime ? t.completed : oldT.completed;

              const oldSunTime = parseTime(oldT.sundayUpdatedAt || oldTime);
              const incSunTime = parseTime(t.sundayUpdatedAt || incTime);
              const isSunDone = incSunTime >= oldSunTime ? (t.sundayDone !== undefined ? t.sundayDone : oldT.sundayDone) : oldT.sundayDone;

              const oldMonTime = parseTime(oldT.monthlyUpdatedAt || oldTime);
              const incMonTime = parseTime(t.monthlyUpdatedAt || incTime);
              const isMonDone = incMonTime >= oldMonTime ? (t.monthlyDone !== undefined ? t.monthlyDone : oldT.monthlyDone) : oldT.monthlyDone;

              const oldBiTime = parseTime(oldT.biMonthlyUpdatedAt || oldTime);
              const incBiTime = parseTime(t.biMonthlyUpdatedAt || incTime);
              const isBiDone = incBiTime >= oldBiTime ? (t.biMonthlyDone !== undefined ? t.biMonthlyDone : oldT.biMonthlyDone) : oldT.biMonthlyDone;

              pltMap.set(t.id, {
                ...oldT,
                ...t,
                completed: isDone,
                completedAt: isDone ? (t.completedAt || oldT.completedAt || Date.now()) : null,
                sundayDone: !!isSunDone,
                sundayUpdatedAt: Math.max(oldSunTime, incSunTime),
                monthlyDone: !!isMonDone,
                monthlyUpdatedAt: Math.max(oldMonTime, incMonTime),
                biMonthlyDone: !!isBiDone,
                biMonthlyUpdatedAt: Math.max(oldBiTime, incBiTime),
                updatedAt: Math.max(oldTime, incTime, Date.now())
              });
            }
          });
          mergedPrelimsTargets = Array.from(pltMap.values());
        }

        // Two-way reconciliation between entryMap and mergedPrelimsTargets (matched strictly by related ID)
        mergedPrelimsTargets.forEach(t => {
          const allTargetIds = getRelatedIds(t.id);
          let entry = null;
          for (const rid of allTargetIds) {
            if (entryMap.has(rid)) {
              entry = entryMap.get(rid);
              break;
            }
          }
          if (entry) {
            // R0 / Completed sync
            const eTime = parseTime(entry.r0UpdatedAt || entry.updatedAt);
            const tTime = parseTime(t.updatedAt || t.completedAt);
            if (eTime > tTime) {
              t.completed = !!entry.r0Done;
              t.completedAt = entry.r0Done ? eTime : null;
              t.updatedAt = eTime;
            } else if (tTime > eTime) {
              entry.r0Done = !!t.completed;
              entry.r0UpdatedAt = tTime;
            }

            // Sunday Vault (R7) milestone sync
            const eSunTime = parseTime(entry.sundayUpdatedAt || entry.updatedAt);
            const tSunTime = parseTime(t.sundayUpdatedAt || t.updatedAt);
            if (eSunTime > tSunTime) {
              t.sundayDone = !!entry.sundayDone;
              t.sundayUpdatedAt = eSunTime;
            } else if (tSunTime > eSunTime) {
              entry.sundayDone = !!t.sundayDone;
              entry.sundayUpdatedAt = tSunTime;
            } else if (entry.sundayDone !== undefined || t.sundayDone !== undefined) {
              const sunVal = (entry.sundayDone !== undefined) ? !!entry.sundayDone : !!t.sundayDone;
              entry.sundayDone = sunVal;
              t.sundayDone = sunVal;
            }

            // Monthly milestone sync
            const eMonTime = parseTime(entry.monthlyUpdatedAt || entry.updatedAt);
            const tMonTime = parseTime(t.monthlyUpdatedAt || t.updatedAt);
            if (eMonTime > tMonTime) {
              t.monthlyDone = !!entry.monthlyDone;
              t.monthlyUpdatedAt = eMonTime;
            } else if (tMonTime > eMonTime) {
              entry.monthlyDone = !!t.monthlyDone;
              entry.monthlyUpdatedAt = tMonTime;
            } else if (entry.monthlyDone !== undefined || t.monthlyDone !== undefined) {
              const monVal = (entry.monthlyDone !== undefined) ? !!entry.monthlyDone : !!t.monthlyDone;
              entry.monthlyDone = monVal;
              t.monthlyDone = monVal;
            }

            // BiMonthly milestone sync
            const eBiTime = parseTime(entry.biMonthlyUpdatedAt || entry.updatedAt);
            const tBiTime = parseTime(t.biMonthlyUpdatedAt || t.updatedAt);
            if (eBiTime > tBiTime) {
              t.biMonthlyDone = !!entry.biMonthlyDone;
              t.biMonthlyUpdatedAt = eBiTime;
            } else if (tBiTime > eBiTime) {
              entry.biMonthlyDone = !!t.biMonthlyDone;
              entry.biMonthlyUpdatedAt = tBiTime;
            } else if (entry.biMonthlyDone !== undefined || t.biMonthlyDone !== undefined) {
              const biVal = (entry.biMonthlyDone !== undefined) ? !!entry.biMonthlyDone : !!t.biMonthlyDone;
              entry.biMonthlyDone = biVal;
              t.biMonthlyDone = biVal;
            }
          }
        });

        const mergedEntries = Array.from(entryMap.values());
        const mergedHabits = { ...(existingData.HABITS_LOG || {}), ...(body.HABITS_LOG || {}) };
        const mergedTrackerProgress = mergeTrackerProgress(existingData.TRACKER_PROGRESS, body.TRACKER_PROGRESS || body.progress);
        const mergedScoresObj = mergeScoreRegister(
          existingData.SCORE_REGISTER,
          body.SCORE_REGISTER,
          body.deletedScoreIds,
          existingData.deletedScoreIds
        );
        const mergedScores = mergedScoresObj.mergedScores;
        const mergedDeletedScoreIds = mergedScoresObj.deletedScoreIds;
        const mergedEbEntries = mergeEbEntries(existingData.EB_ENTRIES, body.EB_ENTRIES);
        const mergedPyqUserData = mergePyqUserData(existingData.PYQ_USER_DATA, body.PYQ_USER_DATA);

        const updated = {
          ...existingData,
          ...body,
          ENTRIES: mergedEntries,
          PRELIMS_TARGETS_V1: mergedPrelimsTargets,
          HABITS_LOG: mergedHabits,
          TRACKER_PROGRESS: mergedTrackerProgress,
          SCORE_REGISTER: mergedScores,
          EB_ENTRIES: mergedEbEntries,
          PYQ_USER_DATA: mergedPyqUserData,
          deletedScoreIds: mergedDeletedScoreIds,
          deletedEntryIds: Array.from(delEntrySet)
        };
        const saved = writeSyncData(updated);
        return sendJsonResponse(res, 200, { success: true, timestamp: saved.timestamp, ...saved, data: saved });
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

  // Push Notification Endpoints
  if (reqPath.startsWith('/api/push/')) {
    if (reqPath === '/api/push/subscribe' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const PUSH_FILE = path.join(DATA_DIR, 'push_subscriptions.json');
        ensureStorage();
        let subs = [];
        if (fs.existsSync(PUSH_FILE)) {
          try { subs = JSON.parse(fs.readFileSync(PUSH_FILE, 'utf-8')); } catch(e){ subs = []; }
        }
        if (body && body.endpoint) {
          if (!subs.some(s => s.endpoint === body.endpoint)) {
            subs.push(body);
            fs.writeFileSync(PUSH_FILE, JSON.stringify(subs, null, 2), 'utf-8');
          }
        }
        return sendJsonResponse(res, 200, { success: true, count: subs.length });
      } catch (err) {
        return sendJsonResponse(res, 400, { success: false, error: 'Invalid subscription body' });
      }
    }

    if (reqPath === '/api/push/test' && req.method === 'POST') {
      return sendJsonResponse(res, 200, { success: true, message: 'Test trigger acknowledged' });
    }
  }

  // Current Affairs Notes Extraction Vision API Endpoint
  if (reqPath === '/api/ca-extract') {
    const caHandler = require('./api/ca-extract.js');
    try {
      if (req.method === 'POST') {
        req.body = await parseJsonBody(req);
      }
      return caHandler(req, res);
    } catch (err) {
      return sendJsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // Static File Serving
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/tracker') reqPath = '/tracker.html';
  if (reqPath === '/pyq') reqPath = '/pyq.html';
  if (reqPath === '/more/current-affairs-magazines' || reqPath === '/more/current-affairs-magazines/') {
    reqPath = '/features/ca-notes/index.html';
  }
  if (reqPath === '/more/can.css' || reqPath === '/can.css') {
    reqPath = '/features/ca-notes/can.css';
  }
  if (reqPath === '/more/can.js' || reqPath === '/can.js') {
    reqPath = '/features/ca-notes/can.js';
  }

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const range = req.headers.range;
    if (range && ext === '.pdf') {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/ and http://127.0.0.1:${PORT}/`);
});

