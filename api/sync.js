let syncData = { ENTRIES: [], TRACKER_PROGRESS: {}, HABITS_LOG: {}, CUSTOM_HABITS: [], CONFIG: {}, timestamp: 0 };

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

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const incomingEntries = body.ENTRIES || [];
    
    // Merge entries by ID so entries logged on mobile or desktop are never lost
    const entryMap = new Map();
    (syncData.ENTRIES || []).forEach(e => { if (e && e.id) entryMap.set(e.id, e); });
    incomingEntries.forEach(e => {
      if (e && e.id) {
        if (!entryMap.has(e.id)) {
          entryMap.set(e.id, e);
        } else {
          const oldItem = entryMap.get(e.id);
          entryMap.set(e.id, {
            ...oldItem,
            ...e,
            r0Done: typeof e.r0Done === 'boolean' ? e.r0Done : !!oldItem.r0Done,
            sundayDone: typeof e.sundayDone === 'boolean' ? e.sundayDone : !!oldItem.sundayDone,
            monthlyDone: typeof e.monthlyDone === 'boolean' ? e.monthlyDone : !!oldItem.monthlyDone,
            biMonthlyDone: typeof e.biMonthlyDone === 'boolean' ? e.biMonthlyDone : !!oldItem.biMonthlyDone
          });
        }
      }
    });

    const mergedEntries = Array.from(entryMap.values());
    const mergedHabits = { ...(syncData.HABITS_LOG || {}), ...(body.HABITS_LOG || {}) };
    const mergedTrackerProgress = mergeProgress(syncData.TRACKER_PROGRESS, body.TRACKER_PROGRESS || body.progress);

    syncData = {
      ...syncData,
      ...body,
      ENTRIES: mergedEntries,
      HABITS_LOG: mergedHabits,
      TRACKER_PROGRESS: mergedTrackerProgress,
      timestamp: Date.now()
    };
    return res.status(200).json({
      success: true,
      timestamp: syncData.timestamp,
      ENTRIES: syncData.ENTRIES,
      TRACKER_PROGRESS: syncData.TRACKER_PROGRESS,
      HABITS_LOG: syncData.HABITS_LOG
    });
  }

  return res.status(200).json(syncData);
};
