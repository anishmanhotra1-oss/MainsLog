let syncData = { ENTRIES: [], HABITS_LOG: {}, CUSTOM_HABITS: [], CONFIG: {}, timestamp: 0 };

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
            r0Done: oldItem.r0Done || e.r0Done,
            sundayDone: oldItem.sundayDone || e.sundayDone,
            monthlyDone: oldItem.monthlyDone || e.monthlyDone,
            biMonthlyDone: oldItem.biMonthlyDone || e.biMonthlyDone
          });
        }
      }
    });

    const mergedEntries = Array.from(entryMap.values());
    const mergedHabits = { ...(syncData.HABITS_LOG || {}), ...(body.HABITS_LOG || {}) };

    syncData = {
      ...syncData,
      ...body,
      ENTRIES: mergedEntries,
      HABITS_LOG: mergedHabits,
      timestamp: Date.now()
    };
    return res.status(200).json({ success: true, timestamp: syncData.timestamp, ENTRIES: syncData.ENTRIES, HABITS_LOG: syncData.HABITS_LOG });
  }

  return res.status(200).json(syncData);
};
