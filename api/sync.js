const CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a067127101a0898aa8da600d';

let memorySyncData = { ENTRIES: [], TRACKER_PROGRESS: {}, HABITS_LOG: {}, CUSTOM_HABITS: [], CONFIG: {}, SCORE_REGISTER: { gs: {}, csat: {} }, deletedScoreIds: [], timestamp: 0 };

async function fetchCloudSyncData() {
  try {
    const res = await fetch(CLOUD_SYNC_URL);
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && typeof json.data === 'object') {
        memorySyncData = {
          ENTRIES: Array.isArray(json.data.ENTRIES) ? json.data.ENTRIES : memorySyncData.ENTRIES,
          TRACKER_PROGRESS: json.data.TRACKER_PROGRESS || memorySyncData.TRACKER_PROGRESS,
          HABITS_LOG: json.data.HABITS_LOG || memorySyncData.HABITS_LOG,
          CUSTOM_HABITS: json.data.CUSTOM_HABITS || memorySyncData.CUSTOM_HABITS,
          CONFIG: json.data.CONFIG || memorySyncData.CONFIG,
          SCORE_REGISTER: json.data.SCORE_REGISTER || memorySyncData.SCORE_REGISTER,
          deletedScoreIds: Array.isArray(json.data.deletedScoreIds) ? json.data.deletedScoreIds : memorySyncData.deletedScoreIds,
          timestamp: json.data.timestamp || memorySyncData.timestamp
        };
      }
    }
  } catch (e) {}
  return memorySyncData;
}

async function saveCloudSyncData(data) {
  memorySyncData = data;
  try {
    await fetch(CLOUD_SYNC_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'MainsLog_Anish_Sync_Key',
        data: data
      })
    });
  } catch (e) {}
}

function parseTime(t) {
  if (!t) return 0;
  if (typeof t === 'number') return t;
  const parsed = new Date(t).getTime();
  return isNaN(parsed) ? 0 : parsed;
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const cloudData = await fetchCloudSyncData();
    return res.status(200).json(cloudData);
  }

  if (req.method === 'POST') {
    const currentData = await fetchCloudSyncData();
    const body = req.body || {};

    if (body.resetAll) {
      const resetData = {
        ENTRIES: [],
        TRACKER_PROGRESS: {},
        HABITS_LOG: {},
        CUSTOM_HABITS: body.CUSTOM_HABITS || [],
        CONFIG: body.CONFIG || {},
        SCORE_REGISTER: { gs: {}, csat: {} },
        deletedScoreIds: [],
        timestamp: Date.now()
      };
      await saveCloudSyncData(resetData);
      return res.status(200).json({ success: true, ...resetData });
    }

    const incomingEntries = body.ENTRIES || [];
    const deletedIds = new Set(body.deletedIds || []);
    
    // Merge entries using milestone timestamps so ticking & unticking sync perfectly cross-device
    const entryMap = new Map();
    (currentData.ENTRIES || []).forEach(e => {
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
    const mergedHabits = { ...(currentData.HABITS_LOG || {}), ...(body.HABITS_LOG || {}) };
    const mergedTrackerProgress = mergeTrackerProgress(currentData.TRACKER_PROGRESS, body.TRACKER_PROGRESS || body.progress);
    const { mergedScores, deletedScoreIds: mergedDeletedScoreIds } = mergeScoreRegister(
      currentData.SCORE_REGISTER,
      body.SCORE_REGISTER,
      body.deletedScoreIds,
      currentData.deletedScoreIds
    );

    const updatedData = {
      ...currentData,
      ...body,
      ENTRIES: mergedEntries,
      HABITS_LOG: mergedHabits,
      TRACKER_PROGRESS: mergedTrackerProgress,
      SCORE_REGISTER: mergedScores,
      deletedScoreIds: mergedDeletedScoreIds,
      timestamp: Date.now()
    };

    await saveCloudSyncData(updatedData);

    return res.status(200).json({
      success: true,
      timestamp: updatedData.timestamp,
      ENTRIES: updatedData.ENTRIES,
      TRACKER_PROGRESS: updatedData.TRACKER_PROGRESS,
      HABITS_LOG: updatedData.HABITS_LOG,
      SCORE_REGISTER: updatedData.SCORE_REGISTER,
      deletedScoreIds: updatedData.deletedScoreIds
    });
  }

  return res.status(200).json(memorySyncData);
};
