let trackerProgress = {};

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  if (url.includes('/progress')) {
    return res.status(200).json({ success: true, progress: trackerProgress, updatedAt: new Date().toISOString() });
  }

  if (url.includes('/update')) {
    const body = req.body || {};
    const { day, key, checked, note } = body;
    if (day && key) {
      if (!trackerProgress[day]) trackerProgress[day] = { checks: {}, notes: {}, dates: {} };
      if (!trackerProgress[day].checks) trackerProgress[day].checks = {};
      trackerProgress[day].checks[key] = !!checked;
      if (note !== undefined) {
        if (!trackerProgress[day].notes) trackerProgress[day].notes = {};
        trackerProgress[day].notes[key] = note;
      }
    }
    return res.status(200).json({ success: true, progress: trackerProgress, updatedAt: new Date().toISOString() });
  }

  return res.status(200).json({ success: true, progress: trackerProgress });
};
