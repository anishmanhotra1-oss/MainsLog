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

function mergeProgress(target, source) {
  if (!source || typeof source !== 'object') return target || {};
  const merged = { ...(target || {}) };
  for (const day in source) {
    if (!merged[day]) {
      merged[day] = { ...source[day] };
      continue;
    }
    merged[day] = {
      checks: { ...(merged[day].checks || {}), ...(source[day].checks || {}) },
      notes: { ...(merged[day].notes || {}), ...(source[day].notes || {}) },
      dates: { ...(merged[day].dates || {}), ...(source[day].dates || {}) }
    };
  }
  return merged;
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
    
    // Merge entries by ID so entries logged on mobile or desktop are never lost
    const entryMap = new Map();
    (currentData.ENTRIES || []).forEach(e => { if (e && e.id) entryMap.set(e.id, e); });
    incomingEntries.forEach(e => {
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
    const mergedHabits = { ...(currentData.HABITS_LOG || {}), ...(body.HABITS_LOG || {}) };
    const mergedTrackerProgress = mergeProgress(currentData.TRACKER_PROGRESS, body.TRACKER_PROGRESS || body.progress);

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
