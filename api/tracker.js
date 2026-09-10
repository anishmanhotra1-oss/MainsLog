const CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a067127101a0898aa8da600d';
let trackerProgress = {};

async function fetchCloudProgress() {
  try {
    const res = await fetch(CLOUD_SYNC_URL);
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && json.data.TRACKER_PROGRESS) {
        trackerProgress = json.data.TRACKER_PROGRESS;
      }
    }
  } catch (e) {}
  return trackerProgress;
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
    return res.status(200).json({ success: true, progress: prog, updatedAt: new Date().toISOString() });
  }

  if (url.includes('/update')) {
    await fetchCloudProgress();
    const body = req.body || {};
    const { day, key, checked, note, progress } = body;
    if (progress && typeof progress === 'object') {
      trackerProgress = { ...trackerProgress, ...progress };
    }
    if (day && key) {
      if (!trackerProgress[day]) trackerProgress[day] = { checks: {}, notes: {}, dates: {} };
      if (!trackerProgress[day].checks) trackerProgress[day].checks = {};
      trackerProgress[day].checks[key] = !!checked;
      if (note !== undefined) {
        if (!trackerProgress[day].notes) trackerProgress[day].notes = {};
        trackerProgress[day].notes[key] = note;
      }
    }

    try {
      fetch(CLOUD_SYNC_URL).then(r => r.json()).then(json => {
        const data = (json && json.data) ? json.data : {};
        data.TRACKER_PROGRESS = trackerProgress;
        data.timestamp = Date.now();
        return fetch(CLOUD_SYNC_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'MainsLog_Anish_Sync_Key', data })
        });
      }).catch(() => {});
    } catch(e) {}

    return res.status(200).json({ success: true, progress: trackerProgress, updatedAt: new Date().toISOString() });
  }

  const prog = await fetchCloudProgress();
  return res.status(200).json({ success: true, progress: prog });
};
