const CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a067127101a0898aa8da600d';

let memorySyncData = { ENTRIES: [], TRACKER_PROGRESS: {}, HABITS_LOG: {}, CUSTOM_HABITS: [], CONFIG: {}, timestamp: 0 };

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
      const localTime = mDay.timestamps[k] || 0;
      const serverTime = typeof sTimestamps[k] === 'number' ? sTimestamps[k] : (sTimestamps[k] ? new Date(sTimestamps[k]).getTime() : 0);

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

    const oldTime = oldItem[timeKey] || oldItem.updatedAt || 0;
    const incTime = incomingItem[timeKey] || incomingItem.updatedAt || 0;

    if (incTime >= oldTime) {
      res[doneKey] = incomingItem[doneKey] !== undefined ? incomingItem[doneKey] : oldItem[doneKey];
      res[timeKey] = incTime;
    } else {
      res[doneKey] = oldItem[doneKey] !== undefined ? oldItem[doneKey] : incomingItem[doneKey];
      res[timeKey] = oldTime;
    }
  });

  res.updatedAt = Math.max(oldItem.updatedAt || 0, incomingItem.updatedAt || 0, Date.now());
  return res;
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
    const incomingEntries = body.ENTRIES || [];
    
    // Merge entries using milestone timestamps so ticking & unticking sync perfectly cross-device
    const entryMap = new Map();
    (currentData.ENTRIES || []).forEach(e => { if (e && e.id) entryMap.set(e.id, e); });
    incomingEntries.forEach(e => {
      if (e && e.id) {
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

    const updatedData = {
      ...currentData,
      ...body,
      ENTRIES: mergedEntries,
      HABITS_LOG: mergedHabits,
      TRACKER_PROGRESS: mergedTrackerProgress,
      timestamp: Date.now()
    };

    await saveCloudSyncData(updatedData);

    return res.status(200).json({
      success: true,
      timestamp: updatedData.timestamp,
      ENTRIES: updatedData.ENTRIES,
      TRACKER_PROGRESS: updatedData.TRACKER_PROGRESS,
      HABITS_LOG: updatedData.HABITS_LOG
    });
  }

  return res.status(200).json(memorySyncData);
};
