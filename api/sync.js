const CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a067127101a0898aa8da600d';

let memorySyncData = { ENTRIES: [], TRACKER_PROGRESS: {}, HABITS_LOG: {}, CUSTOM_HABITS: [], CONFIG: {}, SCORE_REGISTER: { gs: {}, csat: {} }, PRELIMS_TARGETS_V1: [], EB_ENTRIES: [], PYQ_USER_DATA: { bookmarks: [], bookmarkMeta: {}, attempted: [], attemptedMeta: {}, answers: {}, quizHistory: [], updatedAt: 0 }, deletedScoreIds: [], deletedEntryIds: [], timestamp: 0 };

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
          PRELIMS_TARGETS_V1: Array.isArray(json.data.PRELIMS_TARGETS_V1) ? json.data.PRELIMS_TARGETS_V1 : memorySyncData.PRELIMS_TARGETS_V1,
          EB_ENTRIES: Array.isArray(json.data.EB_ENTRIES) ? json.data.EB_ENTRIES : (memorySyncData.EB_ENTRIES || []),
          PYQ_USER_DATA: json.data.PYQ_USER_DATA || memorySyncData.PYQ_USER_DATA || { bookmarks: [], bookmarkMeta: {}, attempted: [], attemptedMeta: {}, answers: {}, quizHistory: [], updatedAt: 0 },
          deletedScoreIds: Array.isArray(json.data.deletedScoreIds) ? json.data.deletedScoreIds : memorySyncData.deletedScoreIds,
          deletedEntryIds: Array.isArray(json.data.deletedEntryIds) ? json.data.deletedEntryIds : memorySyncData.deletedEntryIds,
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

  const quizHistoryMap = new Map();
  if (Array.isArray(ex.quizHistory)) {
    ex.quizHistory.forEach(q => { if (q && q.id) quizHistoryMap.set(q.id, q); });
  }
  if (Array.isArray(inc.quizHistory)) {
    inc.quizHistory.forEach(q => {
      if (q && q.id) {
        const existing = quizHistoryMap.get(q.id);
        if (!existing || (q.completedAt || 0) >= (existing.completedAt || 0)) {
          quizHistoryMap.set(q.id, q);
        }
      }
    });
  }
  const quizHistory = Array.from(quizHistoryMap.values()).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const updatedAt = Math.max(parseTime(ex.updatedAt), parseTime(inc.updatedAt), Date.now());

  return {
    bookmarks,
    bookmarkMeta: mergedBmMeta,
    attempted,
    attemptedMeta: mergedAttMeta,
    answers,
    quizHistory,
    updatedAt
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
        PRELIMS_TARGETS_V1: [],
        EB_ENTRIES: [],
        PYQ_USER_DATA: { bookmarks: [], bookmarkMeta: {}, attempted: [], attemptedMeta: {}, answers: {}, quizHistory: [], updatedAt: 0 },
        deletedScoreIds: [],
        deletedEntryIds: [],
        timestamp: Date.now()
      };
      await saveCloudSyncData(resetData);
      return res.status(200).json({ success: true, ...resetData });
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
      ...(currentData.deletedEntryIds || []),
      ...(incomingDeletedEntryIds || [])
    ];
    const delEntrySet = new Set();
    rawDel.forEach(id => {
      getRelatedIds(id).forEach(rid => delEntrySet.add(rid));
    });

    // Merge entries using milestone timestamps so ticking & unticking sync perfectly cross-device
    const entryMap = new Map();
    (currentData.ENTRIES || []).forEach(e => {
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
    let mergedPrelimsTargets = (currentData.PRELIMS_TARGETS_V1 || []).filter(t => {
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
          const existing = pltMap.get(t.id);
          const existingTime = parseTime(existing.updatedAt || existing.completedAt);
          const incomingTime = parseTime(t.updatedAt || t.completedAt);
          const isDone = incomingTime >= existingTime ? t.completed : existing.completed;

          const oldSunTime = parseTime(existing.sundayUpdatedAt || existingTime);
          const incSunTime = parseTime(t.sundayUpdatedAt || incomingTime);
          const isSunDone = incSunTime >= oldSunTime ? (t.sundayDone !== undefined ? t.sundayDone : existing.sundayDone) : existing.sundayDone;

          const oldMonTime = parseTime(existing.monthlyUpdatedAt || existingTime);
          const incMonTime = parseTime(t.monthlyUpdatedAt || incomingTime);
          const isMonDone = incMonTime >= oldMonTime ? (t.monthlyDone !== undefined ? t.monthlyDone : existing.monthlyDone) : existing.monthlyDone;

          const oldBiTime = parseTime(existing.biMonthlyUpdatedAt || existingTime);
          const incBiTime = parseTime(t.biMonthlyUpdatedAt || incomingTime);
          const isBiDone = incBiTime >= oldBiTime ? (t.biMonthlyDone !== undefined ? t.biMonthlyDone : existing.biMonthlyDone) : existing.biMonthlyDone;

          pltMap.set(t.id, {
            ...existing,
            ...t,
            completed: isDone,
            completedAt: isDone ? (t.completedAt || existing.completedAt || Date.now()) : null,
            sundayDone: !!isSunDone,
            sundayUpdatedAt: Math.max(oldSunTime, incSunTime),
            monthlyDone: !!isMonDone,
            monthlyUpdatedAt: Math.max(oldMonTime, incMonTime),
            biMonthlyDone: !!isBiDone,
            biMonthlyUpdatedAt: Math.max(oldBiTime, incBiTime),
            updatedAt: Math.max(existingTime, incomingTime, Date.now())
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
    const mergedHabits = { ...(currentData.HABITS_LOG || {}), ...(body.HABITS_LOG || {}) };
    const mergedTrackerProgress = mergeTrackerProgress(currentData.TRACKER_PROGRESS, body.TRACKER_PROGRESS || body.progress);
    const { mergedScores, deletedScoreIds: mergedDeletedScoreIds } = mergeScoreRegister(
      currentData.SCORE_REGISTER,
      body.SCORE_REGISTER,
      body.deletedScoreIds,
      currentData.deletedScoreIds
    );

    const mergedEbEntries = mergeEbEntries(currentData.EB_ENTRIES, body.EB_ENTRIES);
    const mergedPyqUserData = mergePyqUserData(currentData.PYQ_USER_DATA, body.PYQ_USER_DATA);

    const updatedData = {
      ...currentData,
      ...body,
      ENTRIES: mergedEntries,
      HABITS_LOG: mergedHabits,
      TRACKER_PROGRESS: mergedTrackerProgress,
      SCORE_REGISTER: mergedScores,
      PRELIMS_TARGETS_V1: mergedPrelimsTargets,
      EB_ENTRIES: mergedEbEntries,
      PYQ_USER_DATA: mergedPyqUserData,
      deletedScoreIds: mergedDeletedScoreIds,
      deletedEntryIds: Array.from(delEntrySet),
      timestamp: Date.now()
    };

    await saveCloudSyncData(updatedData);

    return res.status(200).json({
      success: true,
      timestamp: updatedData.timestamp,
      ENTRIES: updatedData.ENTRIES,
      TRACKER_PROGRESS: updatedData.TRACKER_PROGRESS,
      HABITS_LOG: updatedData.HABITS_LOG,
      CUSTOM_HABITS: updatedData.CUSTOM_HABITS,
      CONFIG: updatedData.CONFIG,
      SCORE_REGISTER: updatedData.SCORE_REGISTER,
      PRELIMS_TARGETS_V1: updatedData.PRELIMS_TARGETS_V1,
      EB_ENTRIES: updatedData.EB_ENTRIES,
      PYQ_USER_DATA: updatedData.PYQ_USER_DATA,
      deletedScoreIds: updatedData.deletedScoreIds,
      deletedEntryIds: updatedData.deletedEntryIds
    });
  }

  return res.status(200).json(memorySyncData);
};
