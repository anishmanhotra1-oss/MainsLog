const CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a067127101a0898aa8da600d';
let trackerProgress = {};

function parseTime(t) {
  if (!t) return 0;
  if (typeof t === 'number') return t;
  const parsed = new Date(t).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

let lastCloudTimestamp = 0;

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
      const localNoteTime = parseTime(mDay.timestamps[k + '_note'] || mDay.timestamps[k]);
      const serverNoteTime = parseTime(sTimestamps[k + '_note'] || sTimestamps[k]);
      if (serverNoteTime >= localNoteTime || !mDay.notes[k]) {
        mDay.notes[k] = sNotes[k];
        if (serverNoteTime > 0) mDay.timestamps[k + '_note'] = serverNoteTime;
      }
    }
  }
  return merged;
}

async function fetchCloudProgress() {
  try {
    const res = await fetch(CLOUD_SYNC_URL);
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        if (json.data.TRACKER_PROGRESS) {
          trackerProgress = mergeTrackerProgress(trackerProgress, json.data.TRACKER_PROGRESS);
        }
        if (json.data.timestamp) {
          lastCloudTimestamp = json.data.timestamp;
        }
      }
    }
  } catch (e) {}
  return trackerProgress;
}

async function saveCloudProgress(prog) {
  trackerProgress = prog;
  try {
    const res = await fetch(CLOUD_SYNC_URL);
    if (res.ok) {
      const json = await res.json();
      const data = (json && json.data) ? json.data : {};
      data.TRACKER_PROGRESS = trackerProgress;
      data.timestamp = Date.now();
      lastCloudTimestamp = data.timestamp;
      await fetch(CLOUD_SYNC_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'MainsLog_Anish_Sync_Key', data })
      });
    }
  } catch (e) {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  if (url.includes('/progress')) {
    const prog = await fetchCloudProgress();
    return res.status(200).json({ success: true, progress: prog, updatedAt: new Date(lastCloudTimestamp || Date.now()).toISOString(), timestamp: lastCloudTimestamp });
  }

  if (url.includes('/update')) {
    await fetchCloudProgress();
    const body = req.body || {};
    const { day, key, checked, note, progress, timestamp } = body;
    const now = timestamp || Date.now();

    if (progress && typeof progress === 'object') {
      trackerProgress = mergeTrackerProgress(trackerProgress, progress);
    }
    if (day && key) {
      if (!trackerProgress[day]) trackerProgress[day] = { checks: {}, notes: {}, dates: {}, timestamps: {} };
      if (!trackerProgress[day].checks) trackerProgress[day].checks = {};
      if (!trackerProgress[day].dates) trackerProgress[day].dates = {};
      if (!trackerProgress[day].timestamps) trackerProgress[day].timestamps = {};

      if (checked !== undefined) {
        trackerProgress[day].checks[key] = !!checked;
        trackerProgress[day].timestamps[key] = now;
        if (checked) {
          trackerProgress[day].dates[key] = new Date().toISOString().slice(0, 10);
        } else {
          delete trackerProgress[day].dates[key];
        }
      }
      if (note !== undefined) {
        if (!trackerProgress[day].notes) trackerProgress[day].notes = {};
        trackerProgress[day].notes[key] = note;
        trackerProgress[day].timestamps[key + '_note'] = now;
      }
    }

    await saveCloudProgress(trackerProgress);
    return res.status(200).json({ success: true, progress: trackerProgress, updatedAt: new Date(lastCloudTimestamp || Date.now()).toISOString(), timestamp: lastCloudTimestamp });
  }

  const prog = await fetchCloudProgress();
  return res.status(200).json({ success: true, progress: prog, timestamp: lastCloudTimestamp });
};
