/**
 * UPSC Prelims PYQ Analysis Engine
 * Self-contained module wrapped strictly in an IIFE.
 * Zero global scope pollution. Scoped directly to .pyq-x1 container.
 */
(function () {
  'use strict';

  // Wait for DOM
  document.addEventListener('DOMContentLoaded', initPyqEngine);

  function initPyqEngine() {
    const root = document.querySelector('.pyq-x1');
    if (!root) return;

    // Helper: Scoped DOM Query
    const $ = (sel) => root.querySelector(sel);
    const $$ = (sel) => root.querySelectorAll(sel);

    // Constants & Sync Storage Helpers
    const SYNC_URL = '/api/sync';
    const EB_LS_KEY = 'EB_ENTRIES_v1';

    function loadMeta(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
      } catch (e) { return {}; }
    }

    function saveMeta(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {}
    }

    function loadEbEntries() {
      try {
        const raw = localStorage.getItem(EB_LS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }

    function getGsPartForSubject(subjectId) {
      switch (subjectId) {
        case 'polity': return 'GS2';
        case 'economy': return 'GS3';
        case 'environment': return 'GS3';
        case 'science-tech': return 'GS3';
        case 'geography': return 'GS1';
        case 'history': return 'GS1';
        default: return 'GS2';
      }
    }

    function showPyqToast(msg) {
      let toast = $('#pyqToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pyqToast';
        toast.className = 'pyq-toast';
        root.appendChild(toast);
      }
      toast.textContent = msg;
      toast.classList.add('pyq-toast-visible');
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.classList.remove('pyq-toast-visible');
      }, 3000);
    }

    // State
    const state = {
      bookmarkMeta: loadMeta('pyq_bookmarks_meta'),
      attemptedMeta: loadMeta('pyq_attempted_meta'),
      ebEntries: loadEbEntries(),
      pieMode: 'topics', // 'topics' | 'subtopics'
      indexData: null,
      currentSubjectId: 'polity',
      subjectCache: {}, // { polity: { ... }, economy: { ... } }
      questions: [],
      filteredQuestions: [],
      filters: {
        year: 'ALL',
        topic: 'ALL',
        subTopic: 'ALL',
        type: 'ALL',
        searchQuery: '',
        bookmarkedOnly: false,
        attemptedOnly: false,
        showAllAnswers: false
      },
      currentView: 'questions', // 'questions' | 'analytics' | 'pdfs'
      activePdfId: 'polity',
      sortFreqBy: 'count', // 'count' | 'topic' | 'recent'
      sortFreqAsc: false,
      pagination: {
        page: 1,
        pageSize: 20
      },
      userAnswers: loadMeta('pyq_answers'),
      quizHistory: (function() {
        const h = loadMeta('pyq_daily_quiz_history_v1');
        return Array.isArray(h) ? h : [];
      })(),
      activeQuiz: null,
      quizTab: 'take', // 'take' | 'results' | 'history'
      bookmarks: loadSet('pyq_bookmarks'),
      attempted: loadSet('pyq_attempted')
    };

    // PDF Catalog for Original Scanned Question Banks
    const PDF_CATALOG = [
      {
        id: 'polity',
        subject: 'Indian Polity & Governance',
        file: 'Poli.pdf',
        pages: 356,
        size: '167 MB',
        icon: '🏛️',
        desc: 'Constitutional framework, Parliament, Fundamental Rights, Judiciary & Governance.'
      },
      {
        id: 'economy',
        subject: 'Indian Economy & Development',
        file: 'Eco.pdf',
        pages: 318,
        size: '147 MB',
        icon: '📈',
        desc: 'Macroeconomics, Monetary Policy, Inflation, Balance of Payments, Banking, and Agriculture.'
      },
      {
        id: 'environment',
        subject: 'Environment & Ecology',
        file: 'Env.pdf',
        pages: 544,
        size: '261 MB',
        icon: '🌿',
        desc: 'Biodiversity, Wildlife Protection, Protected Areas, Climate Conventions, and Pollution.'
      },
      {
        id: 'geography',
        subject: 'Indian & World Geography',
        file: 'Geo.pdf',
        pages: 382,
        size: '209 MB',
        icon: '🌍',
        desc: 'Physical geomorphology, drainage basins, climatology, minerals, and location mapping.'
      },
      {
        id: 'modern-history',
        subject: 'Modern Indian History',
        file: 'Mod.pdf',
        pages: 358,
        size: '171 MB',
        icon: '⚔️',
        desc: 'European arrival, 1857 rebellion, Indian National Congress, and Freedom Struggle.'
      },
      {
        id: 'history',
        subject: 'Ancient, Medieval & Culture',
        file: 'AMAC.pdf',
        pages: 418,
        size: '201 MB',
        icon: '🏺',
        desc: 'Indus Valley, Vedic, Buddhism, Jainism, Mauryan, Gupta, Vijayanagara, and Art & Culture.'
      }
    ];

    // LocalStorage Helpers
    function loadSet(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? new Set(JSON.parse(raw)) : new Set();
      } catch (e) {
        return new Set();
      }
    }

    function saveSet(key, set) {
      try {
        localStorage.setItem(key, JSON.stringify(Array.from(set)));
      } catch (e) {}
    }

    // Cross-Device Cloud Sync Engine
    let syncPushTimer = null;
    function syncPushPyqData() {
      clearTimeout(syncPushTimer);
      syncPushTimer = setTimeout(async () => {
        try {
          await fetch(SYNC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              PYQ_USER_DATA: {
                bookmarks: Array.from(state.bookmarks),
                bookmarkMeta: state.bookmarkMeta,
                attempted: Array.from(state.attempted),
                attemptedMeta: state.attemptedMeta,
                answers: state.userAnswers,
                quizHistory: state.quizHistory,
                updatedAt: Date.now()
              }
            })
          });
        } catch (e) {
          console.warn('[PYQ] Cloud sync push failed:', e);
        }
      }, 350);
    }

    async function syncPullPyqData() {
      try {
        const res = await fetch(SYNC_URL, { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();

        // 1. Reconcile PYQ User Data
        if (data && data.PYQ_USER_DATA && typeof data.PYQ_USER_DATA === 'object') {
          const remote = data.PYQ_USER_DATA;
          let changed = false;

          if (remote.bookmarkMeta && typeof remote.bookmarkMeta === 'object') {
            Object.keys(remote.bookmarkMeta).forEach(qid => {
              const rItem = remote.bookmarkMeta[qid];
              const lItem = state.bookmarkMeta[qid];
              if (!lItem || (rItem.updatedAt || 0) > (lItem.updatedAt || 0)) {
                state.bookmarkMeta[qid] = rItem;
                changed = true;
              }
            });
          }
          if (Array.isArray(remote.bookmarks)) {
            remote.bookmarks.forEach(qid => {
              if (!state.bookmarkMeta[qid]) {
                state.bookmarkMeta[qid] = { active: true, updatedAt: remote.updatedAt || Date.now() };
                changed = true;
              }
            });
          }

          if (remote.attemptedMeta && typeof remote.attemptedMeta === 'object') {
            Object.keys(remote.attemptedMeta).forEach(qid => {
              const rItem = remote.attemptedMeta[qid];
              const lItem = state.attemptedMeta[qid];
              if (!lItem || (rItem.updatedAt || 0) > (lItem.updatedAt || 0)) {
                state.attemptedMeta[qid] = rItem;
                changed = true;
              }
            });
          }
          if (Array.isArray(remote.attempted)) {
            remote.attempted.forEach(qid => {
              if (!state.attemptedMeta[qid]) {
                state.attemptedMeta[qid] = { active: true, updatedAt: remote.updatedAt || Date.now() };
                changed = true;
              }
            });
          }

          if (remote.answers && typeof remote.answers === 'object') {
            Object.keys(remote.answers).forEach(qid => {
              const rAns = remote.answers[qid];
              const lAns = state.userAnswers[qid];
              if (!lAns) {
                state.userAnswers[qid] = rAns;
                changed = true;
              } else {
                const rTime = typeof rAns === 'object' ? (rAns.updatedAt || 0) : 0;
                const lTime = typeof lAns === 'object' ? (lAns.updatedAt || 0) : 0;
                if (rTime > lTime) {
                  state.userAnswers[qid] = rAns;
                  changed = true;
                }
              }
            });
          }

          if (Array.isArray(remote.quizHistory)) {
            const histMap = new Map();
            (state.quizHistory || []).forEach(q => { if (q && q.id) histMap.set(q.id, q); });
            remote.quizHistory.forEach(q => {
              if (q && q.id) {
                const ex = histMap.get(q.id);
                if (!ex || (q.completedAt || 0) >= (ex.completedAt || 0)) {
                  histMap.set(q.id, q);
                  changed = true;
                }
              }
            });
            state.quizHistory = Array.from(histMap.values()).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
            saveMeta('pyq_daily_quiz_history_v1', state.quizHistory);
          }

          state.bookmarks = new Set(Object.keys(state.bookmarkMeta).filter(k => state.bookmarkMeta[k] && state.bookmarkMeta[k].active !== false));
          state.attempted = new Set(Object.keys(state.attemptedMeta).filter(k => state.attemptedMeta[k] && state.attemptedMeta[k].active !== false));

          saveSet('pyq_bookmarks', state.bookmarks);
          saveSet('pyq_attempted', state.attempted);
          saveMeta('pyq_bookmarks_meta', state.bookmarkMeta);
          saveMeta('pyq_attempted_meta', state.attemptedMeta);
          saveMeta('pyq_answers', state.userAnswers);

          if (changed) {
            renderHeroStats();
            if (state.currentView === 'questions') {
              renderQuestionList();
            }
          }
        }

        // 2. Reconcile EB_ENTRIES
        if (data && Array.isArray(data.EB_ENTRIES)) {
          state.ebEntries = data.EB_ENTRIES;
          try { localStorage.setItem(EB_LS_KEY, JSON.stringify(data.EB_ENTRIES)); } catch (e) {}
          if (state.currentView === 'questions') {
            renderQuestionList();
          }
        }
      } catch (e) {
        console.warn('[PYQ] Sync pull failed:', e);
      }
    }

    function toggleBookmark(qId) {
      const isCurrentlyBookmarked = state.bookmarks.has(qId);
      const now = Date.now();
      if (isCurrentlyBookmarked) {
        state.bookmarks.delete(qId);
        state.bookmarkMeta[qId] = { active: false, updatedAt: now };
      } else {
        state.bookmarks.add(qId);
        state.bookmarkMeta[qId] = { active: true, updatedAt: now };
      }
      saveSet('pyq_bookmarks', state.bookmarks);
      saveMeta('pyq_bookmarks_meta', state.bookmarkMeta);
      renderHeroStats();
      applyFiltersAndRender();
      syncPushPyqData();
    }

    function toggleAttempted(qId) {
      const isCurrentlyAttempted = state.attempted.has(qId);
      const now = Date.now();
      if (isCurrentlyAttempted) {
        state.attempted.delete(qId);
        state.attemptedMeta[qId] = { active: false, updatedAt: now };
      } else {
        state.attempted.add(qId);
        state.attemptedMeta[qId] = { active: true, updatedAt: now };
      }
      saveSet('pyq_attempted', state.attempted);
      saveMeta('pyq_attempted_meta', state.attemptedMeta);
      renderHeroStats();
      applyFiltersAndRender();
      syncPushPyqData();
    }

    function saveQuestionToExamples(qId) {
      const q = state.questions.find(x => x.id === qId);
      if (!q) return;

      const gsPart = getGsPartForSubject(state.currentSubjectId);
      const title = (q.concept || q.topic || 'UPSC Prelims ' + q.year) + ' (' + q.year + ' PYQ)';
      const purpose = (q.concept ? q.concept + ' — ' : '') + 
        (q.explanation ? q.explanation.slice(0, 240) + '...' : q.question.slice(0, 220) + '...');
      const tag = q.topic ? q.topic.split(/[,&]/)[0].trim() : getSubjectName(state.currentSubjectId);
      const source = 'UPSC Prelims ' + q.year + (q.qNo ? ' (Q.' + q.qNo + ')' : '');

      const entry = {
        id: 'eb_pyq_' + q.id,
        gs_part: gsPart,
        type: 'Example',
        title: title,
        purpose: purpose,
        tag: tag,
        source: source,
        pyq_id: q.id,
        pyq_subject: state.currentSubjectId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      state.ebEntries = loadEbEntries();
      const existingIdx = state.ebEntries.findIndex(e => e.id === entry.id || e.pyq_id === entry.pyq_id);
      if (existingIdx >= 0) {
        state.ebEntries[existingIdx] = { ...state.ebEntries[existingIdx], ...entry, updated_at: new Date().toISOString() };
      } else {
        state.ebEntries.unshift(entry);
      }

      try {
        localStorage.setItem(EB_LS_KEY, JSON.stringify(state.ebEntries));
      } catch (e) {}

      try {
        fetch(SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ EB_ENTRIES: state.ebEntries })
        }).catch(() => {});
      } catch (e) {}

      showPyqToast('💡 Added to Examples Bank under ' + gsPart + '!');

      const card = $('#card-' + qId);
      if (card) {
        const btn = card.querySelector('.pyq-btn-add-example');
        if (btn) {
          btn.classList.add('pyq-is-saved-example');
          btn.innerHTML = '<span>✓ In Examples (' + gsPart + ')</span>';
          btn.title = 'Saved in Examples Bank — Click to view in Examples Bank';
        }
      }
    }

    function handleInitialUrlParams() {
      try {
        const params = new URLSearchParams(window.location.search);
        const subjParam = params.get('subject');
        const searchParam = params.get('search');
        if (subjParam && ['polity', 'economy', 'geography', 'history', 'science-tech', 'environment'].includes(subjParam)) {
          state.currentSubjectId = subjParam;
        }
        if (searchParam) {
          state.filters.searchQuery = searchParam;
          const sInput = $('#pyqSearchInput');
          if (sInput) sInput.value = searchParam;
        }
      } catch (e) {}
    }

    // 1. Initial Load of Master Index
    loadMasterIndex();

    async function loadMasterIndex() {
      renderLoading('Loading UPSC PYQ Master Index...');
      try {
        const res = await fetch('pyq-data/index.json');
        if (!res.ok) throw new Error('Failed to load pyq-data/index.json (' + res.status + ')');
        state.indexData = await res.json();
        renderSubjectTabs();
        await loadSubjectData(state.currentSubjectId);
      } catch (err) {
        console.error('[PYQ Error]', err);
        renderError('Could not load PYQ Master Index.', () => loadMasterIndex());
      }
    }

    // 2. Load Subject Data (Lazy on-demand)
    async function loadSubjectData(subjectId) {
      state.currentSubjectId = subjectId;
      state.pagination.page = 1;

      // Sync active PDF catalog item with selected subject
      if (subjectId === 'polity') state.activePdfId = 'polity';
      else if (subjectId === 'economy') state.activePdfId = 'economy';
      else if (subjectId === 'environment') state.activePdfId = 'environment';
      else if (subjectId === 'geography') state.activePdfId = 'geography';
      else if (subjectId === 'history') state.activePdfId = 'history';

      updateActiveTabUI();

      if (state.subjectCache[subjectId]) {
        applyLoadedData(state.subjectCache[subjectId]);
        return;
      }

      renderLoading('Fetching ' + getSubjectName(subjectId) + ' PYQ archive...');
      try {
        const res = await fetch('pyq-data/' + subjectId + '.json');
        if (!res.ok) throw new Error('Failed to load pyq-data/' + subjectId + '.json (' + res.status + ')');
        const data = await res.json();
        state.subjectCache[subjectId] = data;
        applyLoadedData(data);
      } catch (err) {
        console.error('[PYQ Error]', err);
        renderError('Failed to fetch ' + getSubjectName(subjectId) + ' questions.', () => loadSubjectData(subjectId));
      }
    }

    function applyLoadedData(data) {
      state.questions = Array.isArray(data.questions) ? data.questions : (Array.isArray(data) ? data : []);
      populateFilterOptions();
      applyFiltersAndRender();
      renderSubjectBanner();
      renderHeroStats();
    }

    function getSubjectMeta(id) {
      if (!state.indexData || !Array.isArray(state.indexData.subjects)) return null;
      return state.indexData.subjects.find(s => s.id === id);
    }

    function getSubjectName(id) {
      const meta = getSubjectMeta(id);
      return meta ? meta.name : id;
    }

    // 3. Render Subject Tabs
    function renderSubjectTabs() {
      const container = $('#pyqTabsContainer');
      if (!container || !state.indexData) return;

      container.innerHTML = state.indexData.subjects.map(sub => `
        <button class="pyq-tab-btn ${sub.id === state.currentSubjectId ? 'pyq-active' : ''}" data-subject="${sub.id}" role="tab" aria-selected="${sub.id === state.currentSubjectId}">
          <span>${sub.icon || '📚'}</span>
          <span>${sub.name}</span>
          <span class="pyq-tab-count">${sub.totalQuestions || 0}</span>
        </button>
      `).join('');

      container.querySelectorAll('.pyq-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sId = btn.getAttribute('data-subject');
          if (sId && sId !== state.currentSubjectId) {
            loadSubjectData(sId);
          }
        });
      });
    }

    function updateActiveTabUI() {
      $$('.pyq-tab-btn').forEach(btn => {
        const isCurrent = btn.getAttribute('data-subject') === state.currentSubjectId;
        btn.classList.toggle('pyq-active', isCurrent);
        btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });
    }

    // 4. Subject Summary & High Yield Banner
    function renderSubjectBanner() {
      const banner = $('#pyqSubjectBanner');
      if (!banner) return;
      const meta = getSubjectMeta(state.currentSubjectId);
      if (!meta) {
        banner.style.display = 'none';
        return;
      }
      banner.style.display = 'block';

      const highYieldTags = (meta.highYieldTopics || []).map(t =>
        `<button type="button" class="pyq-hy-tag" data-tag="${encodeURIComponent(t)}" title="Filter questions on ${t}">🎯 ${t}</button>`
      ).join('');

      banner.innerHTML = `
        <div class="pyq-banner-title">
          <span>${meta.icon || '📌'}</span>
          <span>${meta.name} — Examiner Trends &amp; Strategy</span>
        </div>
        <div class="pyq-banner-pattern">
          <strong>Examiner Mindset:</strong> ${meta.examinerPattern || 'Focus on fundamental principles and contemporary applications.'}
        </div>
        <div class="pyq-high-yield-strip">
          <span style="font-size: 11px; font-weight: 800; color: var(--pyq-text-muted); margin-right: 4px; text-transform:uppercase; letter-spacing:0.04em;">HIGH YIELD FOCUS:</span>
          ${highYieldTags}
        </div>
      `;

      banner.querySelectorAll('.pyq-hy-tag').forEach(tagBtn => {
        tagBtn.addEventListener('click', () => {
          const raw = tagBtn.getAttribute('data-tag');
          if (raw) {
            const topic = decodeURIComponent(raw);
            const searchInput = $('#pyqSearchInput');
            if (searchInput) {
              searchInput.value = topic;
              state.filters.searchQuery = topic;
              const clr = $('#pyqSearchClear');
              if (clr) clr.style.display = 'flex';
            }
            switchToQuestionsView();
          }
        });
      });
    }

    // 5. Hero Stats
    function renderHeroStats() {
      const totalPyqsEl = $('#pyqHeroTotalPyqs');
      const yearsEl = $('#pyqHeroYears');
      const attemptsEl = $('#pyqHeroAttempted');
      const bookmarkedEl = $('#pyqHeroBookmarked');

      if (totalPyqsEl && state.indexData) {
        const sum = state.indexData.subjects.reduce((acc, s) => acc + (s.totalQuestions || 0), 0);
        totalPyqsEl.textContent = sum + '+';
      }
      if (yearsEl && state.indexData && state.indexData.yearsCovered) {
        const y = state.indexData.yearsCovered;
        yearsEl.textContent = `${y[0]}–${y[y.length - 1]}`;
      }
      if (attemptsEl) attemptsEl.textContent = state.attempted.size;
      if (bookmarkedEl) bookmarkedEl.textContent = state.bookmarks.size;

      const dailyQuizValEl = $('#pyqHeroDailyQuizVal');
      const dailyQuizLblEl = $('#pyqHeroDailyQuizLbl');
      if (dailyQuizValEl) {
        const todayStr = getLocalDateStr();
        const todayRecord = getQuizRecordForDate(todayStr);
        if (todayRecord) {
          dailyQuizValEl.textContent = `${todayRecord.score}/40`;
          dailyQuizValEl.style.color = 'var(--pyq-emerald)';
          if (dailyQuizLblEl) dailyQuizLblEl.textContent = 'Completed Today ✓';
        } else {
          dailyQuizValEl.textContent = '20 Qs';
          dailyQuizValEl.style.color = 'var(--pyq-amber)';
          if (dailyQuizLblEl) dailyQuizLblEl.textContent = "Today's Mixed Quiz";
        }
      }
    }

    // 6. Filter Population
    function populateFilterOptions() {
      const yearSelect = $('#pyqFilterYear');
      const topicSelect = $('#pyqFilterTopic');
      const subTopicSelect = $('#pyqFilterSubTopic');
      const typeSelect = $('#pyqFilterType');

      const years = new Set();
      const topics = new Set();
      const subTopics = new Set();
      const types = new Set();

      state.questions.forEach(q => {
        if (q.year) years.add(q.year);
        if (q.topic) topics.add(q.topic);
        if (q.subTopic) subTopics.add(q.subTopic);
        if (q.type) types.add(q.type);
      });

      if (yearSelect) {
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        yearSelect.innerHTML = `<option value="ALL">All Years (${sortedYears.length})</option>` +
          sortedYears.map(y => `<option value="${y}">${y}</option>`).join('');
        yearSelect.value = state.filters.year;
      }

      if (topicSelect) {
        const sortedTopics = Array.from(topics).sort();
        topicSelect.innerHTML = `<option value="ALL">All Topics (${sortedTopics.length})</option>` +
          sortedTopics.map(t => `<option value="${t}">${t}</option>`).join('');
        topicSelect.value = state.filters.topic;
      }

      if (subTopicSelect) {
        const sortedSubTopics = Array.from(subTopics).sort();
        subTopicSelect.innerHTML = `<option value="ALL">All Sub-Topics (${sortedSubTopics.length})</option>` +
          sortedSubTopics.map(st => `<option value="${st}">${st}</option>`).join('');
        subTopicSelect.value = state.filters.subTopic;
      }

      if (typeSelect) {
        const sortedTypes = Array.from(types).sort();
        typeSelect.innerHTML = `<option value="ALL">All Question Types</option>` +
          sortedTypes.map(ty => `<option value="${ty}">${formatType(ty)}</option>`).join('');
        typeSelect.value = state.filters.type;
      }
    }

    function formatType(str) {
      if (!str) return 'Standard';
      return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    }

    // 7. Filtering & View Dispatcher
    function applyFiltersAndRender() {
      const f = state.filters;
      const qLower = f.searchQuery.trim().toLowerCase();

      state.filteredQuestions = state.questions.filter(q => {
        if (f.year !== 'ALL' && String(q.year) !== String(f.year)) return false;
        if (f.topic !== 'ALL' && q.topic !== f.topic) return false;
        if (f.subTopic !== 'ALL' && q.subTopic !== f.subTopic) return false;
        if (f.type !== 'ALL' && q.type !== f.type) return false;
        if (f.bookmarkedOnly && !state.bookmarks.has(q.id)) return false;
        if (f.attemptedOnly && !state.attempted.has(q.id)) return false;
        if (f.recentOnly && (q.year < 2013)) return false;
        if (f.trapsOnly && (!q.trap || q.trap.length < 5)) return false;
        if (f.unattemptedOnly && state.attempted.has(q.id)) return false;

        if (qLower) {
          const matchQuestion = q.question && q.question.toLowerCase().includes(qLower);
          const matchTopic = q.topic && q.topic.toLowerCase().includes(qLower);
          const matchSubTopic = q.subTopic && q.subTopic.toLowerCase().includes(qLower);
          const matchConcept = q.concept && q.concept.toLowerCase().includes(qLower);
          const matchExplanation = q.explanation && q.explanation.toLowerCase().includes(qLower);
          const matchTrap = q.trap && q.trap.toLowerCase().includes(qLower);
          const matchStatements = Array.isArray(q.statements) && q.statements.some(s => s.toLowerCase().includes(qLower));

          if (!matchQuestion && !matchTopic && !matchSubTopic && !matchConcept && !matchExplanation && !matchTrap && !matchStatements) {
            return false;
          }
        }
        return true;
      });

      renderStatusBar();
      if (state.currentView === 'quiz') {
        renderQuizView();
      } else if (state.currentView === 'analytics') {
        renderTopicFrequencyAnalytics();
      } else if (state.currentView === 'pdfs') {
        renderPdfArchivesView();
      } else {
        renderQuestionList();
      }
    }

    function renderStatusBar() {
      const countEl = $('#pyqStatusCount');
      const subjectNameEl = $('#pyqStatusSubject');
      if (countEl) countEl.textContent = state.filteredQuestions.length;
      if (subjectNameEl) subjectNameEl.textContent = getSubjectName(state.currentSubjectId);
    }

    // 8. Render Question Cards with Pagination
    function renderQuestionList() {
      const listContainer = $('#pyqQuestionList');
      const analyticsContainer = $('#pyqAnalyticsView');
      const paginationContainer = $('#pyqPagination');
      const pdfContainer = $('#pyqPdfView');
      const statusBar = $('#pyqStatusBar');

      if (analyticsContainer) analyticsContainer.style.display = 'none';
      if (pdfContainer) pdfContainer.style.display = 'none';
      if (statusBar) statusBar.style.display = 'block';
      if (listContainer) listContainer.style.display = 'block';

      if (!listContainer) return;

      if (state.filteredQuestions.length === 0) {
        listContainer.innerHTML = `
          <div class="pyq-state-box">
            <div class="pyq-state-icon">🔍</div>
            <div class="pyq-state-title">No Matching PYQs Found</div>
            <div class="pyq-state-desc">Try clearing filters or searching with different keywords like 'Preamble', 'Inflation', or 'Sanctuary'.</div>
            <button class="pyq-retry-btn" id="pyqClearFiltersBtn">Reset All Filters</button>
          </div>
        `;
        const clearBtn = $('#pyqClearFiltersBtn');
        if (clearBtn) clearBtn.addEventListener('click', resetFilters);
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
      }

      // Pagination slice
      const total = state.filteredQuestions.length;
      const pageSize = state.pagination.pageSize;
      const totalPages = Math.ceil(total / pageSize);
      if (state.pagination.page > totalPages) state.pagination.page = totalPages;
      if (state.pagination.page < 1) state.pagination.page = 1;

      const startIdx = (state.pagination.page - 1) * pageSize;
      const endIdx = Math.min(startIdx + pageSize, total);
      const pageItems = state.filteredQuestions.slice(startIdx, endIdx);

      listContainer.innerHTML = pageItems.map(q => renderSingleQuestionCard(q)).join('');

      renderPagination(startIdx + 1, endIdx, total, totalPages);
      attachQuestionCardEvents(listContainer);
    }

    function cleanStr(txt) {
      if (!txt) return '';
      return String(txt).replace(/\s+/g, ' ').trim();
    }

    function escapeHtml(str) {
      if (typeof str !== 'string') return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function getQuestionPedagogyAnalysis(q) {
      if (!q) return { whyAsked: '', howAsked: '', expectedQuestion: '' };
      if (q._pedagogy) return q._pedagogy;

      if (q.whyAsked && q.howAsked && q.expectedQuestion) {
        q._pedagogy = {
          whyAsked: q.whyAsked,
          howAsked: q.howAsked,
          expectedQuestion: q.expectedQuestion
        };
        return q._pedagogy;
      }

      const subject = cleanStr(q.subject || state.currentSubjectId || 'General Studies');
      const topic = cleanStr(q.topic || 'Core Syllabus');
      const subTopic = cleanStr(q.subTopic || topic);
      const concept = cleanStr(q.concept || q.explanation || '');
      const trap = cleanStr(q.trap || '');
      const rawFacts = Array.isArray(q.relatedFacts) ? q.relatedFacts.map(cleanStr).filter(Boolean) : [];
      const meaningfulFacts = rawFacts.filter(f => !/^question\s*#|^corresponds to|^extracted from|^forumi/i.test(f));
      const qText = cleanStr(q.question || '');
      const stmts = Array.isArray(q.statements) ? q.statements.map(cleanStr).filter(Boolean) : [];
      const qType = cleanStr(q.type || (stmts.length > 0 ? 'statement-based' : 'conceptual'));
      const sLower = subject.toLowerCase();

      // 1. WHY THAT QUESTION IS ASKED
      let whyAsked = q.whyAsked || '';
      if (!whyAsked) {
        let subjectAnchor = '';
        if (sLower.includes('polity')) {
          subjectAnchor = 'Evaluates whether candidates comprehend constitutional architecture, statutory checks & balances, and democratic accountability beyond surface-level article numbers.';
        } else if (sLower.includes('economy')) {
          subjectAnchor = 'Tests foundational macroeconomic logic, monetary/fiscal transmission mechanisms, and developmental indicators essential for policy analysis.';
        } else if (sLower.includes('geography')) {
          subjectAnchor = 'Assesses spatial distribution, physical geomorphological processes, environmental frontiers, and critical resource corridors shaping regional development.';
        } else if (sLower.includes('history')) {
          subjectAnchor = 'Scrutinizes socio-economic transitions, administrative statecraft, institutional legacies, and pivotal turning points of the historical record.';
        } else if (sLower.includes('environment')) {
          subjectAnchor = 'Tests understanding of ecological interdependencies, biodiversity conservation regimes, statutory environmental jurisprudence, and international climate treaties.';
        } else {
          subjectAnchor = 'Measures technological literacy, frontier scientific innovations, and their practical deployment in public health, governance, and national security.';
        }

        let conceptCore = '';
        if (concept) {
          const firstSentence = concept.split(/(?<=[.!?])\s+/)[0];
          conceptCore = firstSentence.length > 180 ? firstSentence.slice(0, 177) + '...' : firstSentence;
        } else {
          conceptCore = `Core principles, institutional roles, and practical applications of ${subTopic}.`;
        }

        whyAsked = `${subjectAnchor} Under '${topic}' (${subTopic}), the examiner assesses whether candidates grasp: "${conceptCore}"`;
      }

      // 2. HOW THAT QUESTION IS ASKED
      let howAsked = q.howAsked || '';
      if (!howAsked) {
        let structuralStyle = '';
        if (stmts.length > 0) {
          structuralStyle = `Framed as a ${stmts.length}-statement analytical problem requiring candidates to verify multiple interdependent premises and eliminate distractors.`;
        } else if (/which of the following is not|incorrect|except/i.test(qText)) {
          structuralStyle = 'Constructed with a negative premise ("is NOT / incorrect"), directly targeting hasty reading and cognitive confirmation bias under timed exam pressure.';
        } else if (/pair|match/i.test(qText) || qType === 'match-the-following') {
          structuralStyle = 'Engineered as a high-precision bilateral match / pairing matrix testing exact one-to-one correspondence.';
        } else if (/chronological|arrange|order|earliest|latest/i.test(qText) || qType === 'chronology') {
          structuralStyle = 'Designed as an evolutionary sequence problem requiring candidates to place milestones accurately on a developmental timeline.';
        } else {
          structuralStyle = 'Crafted as a direct conceptual definition / application problem with closely calibrated distractors demanding clear distinction between adjacent doctrines.';
        }

        let trapDeconstruction = '';
        if (trap) {
          trapDeconstruction = ` Examiner's Trap: ${trap}`;
        } else if (stmts.length > 0) {
          trapDeconstruction = ` Examiner's Trap: Often introduces extreme qualifiers ('always', 'only', 'all') or subtly swaps institutional jurisdictions to test critical vigilance.`;
        } else {
          trapDeconstruction = ` Examiner's Trap: Distractors confuse everyday colloquial usage with precise statutory, economic, or scientific definitions.`;
        }

        howAsked = `${structuralStyle}${trapDeconstruction}`;
      }

      // 3. EXPECTED OTHER QUESTION SHOULD BE ASKED
      let expectedQuestion = q.expectedQuestion || '';
      if (!expectedQuestion) {
        let variants = [];
        if (meaningfulFacts.length > 0) {
          variants.push(`Adjacent Angle: Consider questions testing related factual linkages, e.g., "${meaningfulFacts[0]}"`);
          if (meaningfulFacts.length > 1) {
            variants.push(`Comparative Dimension: Framing comparative provisions or counter-mechanisms involving: "${meaningfulFacts[1]}"`);
          }
        } else {
          variants.push(`Adjacent Angle: A multi-statement question exploring statutory exceptions, procedural limits, or institutional mandates under ${subTopic}.`);
          variants.push(`Comparative Dimension: Cross-comparative analysis between ${subTopic} and corresponding international benchmarks or inter-state frameworks.`);
        }

        variants.push(`Predictive Prelims Yield: Expect upcoming questions to test reverse applications of ${topic} linked to recent policy reforms, judicial rulings, or global regulatory updates.`);
        expectedQuestion = variants.join('\n• ');
        if (!expectedQuestion.startsWith('• ')) expectedQuestion = '• ' + expectedQuestion;
      }

      q.whyAsked = whyAsked;
      q.howAsked = howAsked;
      q.expectedQuestion = expectedQuestion;

      q._pedagogy = { whyAsked, howAsked, expectedQuestion };
      return q._pedagogy;
    }

    function renderSingleQuestionCard(q) {
      const isBookmarked = state.bookmarks.has(q.id);
      const isAttempted = state.attempted.has(q.id);
      const isGlobalShow = state.filters.showAllAnswers;
      const selectedOption = state.userAnswers[q.id];

      // Statements HTML
      let statementsHtml = '';
      if (Array.isArray(q.statements) && q.statements.length > 0) {
        statementsHtml = `
          <ul class="pyq-statements-list">
            ${q.statements.map((s, idx) => `
              <li class="pyq-statement-item">
                <span class="pyq-stmt-num">${idx + 1}.</span>
                <span>${s}</span>
              </li>
            `).join('')}
          </ul>
        `;
      }

      // Options HTML
      let optionsHtml = '';
      if (q.options && typeof q.options === 'object') {
        const optKeys = Object.keys(q.options).sort();
        optionsHtml = `
          <div class="pyq-options-grid" data-qid="${q.id}">
            ${optKeys.map(k => {
              let optClass = 'pyq-option-item';
              const isCorrectAnswer = (k.toLowerCase() === String(q.answer).toLowerCase());
              if (selectedOption) {
                if (isCorrectAnswer) optClass += ' pyq-opt-correct';
                else if (selectedOption.toLowerCase() === k.toLowerCase()) optClass += ' pyq-opt-incorrect';
              } else if (isGlobalShow && isCorrectAnswer) {
                optClass += ' pyq-opt-correct';
              }

              return `
                <div class="${optClass}" data-key="${k}" role="button" tabindex="0" aria-label="Option ${k.toUpperCase()}: ${q.options[k]}">
                  <div class="pyq-opt-key">${k}</div>
                  <div class="pyq-opt-text">${q.options[k]}</div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      // Statement Analysis
      let stmtAnalysisHtml = '';
      if (Array.isArray(q.statementAnalysis) && q.statementAnalysis.length > 0) {
        stmtAnalysisHtml = `
          <div class="pyq-section-title">🔍 Statement-by-Statement Breakdown</div>
          ${q.statementAnalysis.map((sa, i) => {
            const isCorrect = (sa.verdict || '').toLowerCase() === 'correct';
            return `
              <div class="pyq-stmt-analysis-item ${isCorrect ? 'pyq-verdict-correct' : 'pyq-verdict-incorrect'}">
                <span class="pyq-verdict-pill ${isCorrect ? 'pyq-v-correct' : 'pyq-v-incorrect'}">Statement ${i + 1}: ${sa.verdict || ''}</span>
                <div style="font-weight: 700; color: var(--pyq-text-primary); margin-bottom: 4px;">"${sa.text}"</div>
                <div style="color: var(--pyq-text-secondary); line-height: 1.45;">${sa.why || ''}</div>
              </div>
            `;
          }).join('')}
        `;
      }

      // Option Analysis
      let optAnalysisHtml = '';
      if (q.optionAnalysis && typeof q.optionAnalysis === 'object') {
        const oKeys = Object.keys(q.optionAnalysis).sort();
        optAnalysisHtml = `
          <div class="pyq-section-title">📋 Option Rationale</div>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;">
            ${oKeys.map(k => `
              <div style="font-size: 13.5px; line-height: 1.45; background: var(--pyq-bg-subtle); padding: 8px 12px; border-radius: var(--pyq-radius-sm);">
                <strong style="text-transform: uppercase; color: var(--pyq-primary); margin-right: 6px;">(${k})</strong>
                <span>${q.optionAnalysis[k]}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Trap Box
      let trapHtml = '';
      if (q.trap) {
        trapHtml = `
          <div class="pyq-trap-box">
            <div class="pyq-trap-title">⚠️ The Examiner's Trap</div>
            <div>${q.trap}</div>
          </div>
        `;
      }

      // Related Facts
      let factsHtml = '';
      if (Array.isArray(q.relatedFacts) && q.relatedFacts.length > 0) {
        factsHtml = `
          <div class="pyq-section-title">💡 High-Yield Core Facts for Revision</div>
          <ul class="pyq-facts-list">
            ${q.relatedFacts.map(rf => `<li>${rf}</li>`).join('')}
          </ul>
        `;
      }

      // Pedagogical Blueprint: Why asked, How asked, Expected other question should be asked
      const pedagogy = getQuestionPedagogyAnalysis(q);
      const expectedLines = (pedagogy.expectedQuestion || '')
        .split('\n• ')
        .map(s => s.replace(/^•\s*/, '').trim())
        .filter(Boolean);

      const formattedExpectedHtml = expectedLines.length > 1
        ? `<ul class="pyq-pedagogy-list">${expectedLines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
        : `<div>${escapeHtml(pedagogy.expectedQuestion || '')}</div>`;

      const pedagogyHtml = `
        <div class="pyq-pedagogy-section">
          <div class="pyq-pedagogy-header">
            <span class="pyq-pedagogy-main-title">🎯 Question Architecture &amp; Examiner's Mindset</span>
            <span class="pyq-pedagogy-badge-tag">Pedagogy Breakdown</span>
          </div>

          <div class="pyq-pedagogy-grid">
            <div class="pyq-pedagogy-item pyq-item-why">
              <div class="pyq-pedagogy-pill pyq-pill-why">
                <span class="pyq-pill-icon">🎯</span>
                <span>Why that question is asked</span>
              </div>
              <div class="pyq-pedagogy-desc">${escapeHtml(pedagogy.whyAsked)}</div>
            </div>

            <div class="pyq-pedagogy-item pyq-item-how">
              <div class="pyq-pedagogy-pill pyq-pill-how">
                <span class="pyq-pill-icon">📐</span>
                <span>How that question is asked</span>
              </div>
              <div class="pyq-pedagogy-desc">${escapeHtml(pedagogy.howAsked)}</div>
            </div>

            <div class="pyq-pedagogy-item pyq-item-expected">
              <div class="pyq-pedagogy-pill pyq-pill-expected">
                <span class="pyq-pill-icon">🔮</span>
                <span>Expected other question should be asked</span>
              </div>
              <div class="pyq-pedagogy-desc">${formattedExpectedHtml}</div>
            </div>
          </div>
        </div>
      `;

      return `
        <article class="pyq-question-card ${isAttempted ? 'pyq-attempted' : ''}" id="card-${q.id}" data-id="${q.id}">
          <div class="pyq-q-header">
            <div class="pyq-q-meta-strip">
              <span class="pyq-q-tag pyq-tag-year">UPSC ${q.year}</span>
              ${q.qNo ? `<span class="pyq-q-tag pyq-tag-qno">Q.${q.qNo}</span>` : ''}
              <span class="pyq-q-tag pyq-tag-topic">${q.topic || 'General'}</span>
              ${q.type ? `<span class="pyq-q-tag pyq-tag-type">${formatType(q.type)}</span>` : ''}
            </div>

            ` + (() => {
        const gsPart = getGsPartForSubject(state.currentSubjectId);
        const isSavedInExamples = state.ebEntries && state.ebEntries.some(e => e.id === 'eb_pyq_' + q.id || e.pyq_id === q.id);
        return `
            <div class="pyq-q-actions">
              <button class="pyq-icon-btn pyq-btn-add-example ${isSavedInExamples ? 'pyq-is-saved-example' : ''}" data-qid="${q.id}" title="${isSavedInExamples ? 'Saved in Examples Bank — Click to view in Examples Bank' : 'Save this PYQ concept & analysis to Examples Bank'}">
                <span>${isSavedInExamples ? '✓ In Examples (' + gsPart + ')' : '💡 Add to Examples'}</span>
              </button>
              <button class="pyq-icon-btn pyq-btn-attempt ${isAttempted ? 'pyq-marked-attempted' : ''}" data-qid="${q.id}" title="Toggle Attempted Status">
                <span>${isAttempted ? '✓ Attempted' : 'Mark Attempted'}</span>
              </button>
              <button class="pyq-icon-btn pyq-btn-bookmark ${isBookmarked ? 'pyq-bookmarked' : ''}" data-qid="${q.id}" title="Bookmark Question">
                <span>${isBookmarked ? '★ Saved' : '☆ Bookmark'}</span>
              </button>
            </div>
        `;
      })() + `
          </div>

          <div class="pyq-q-text">${q.question}</div>

          ${statementsHtml}
          ${optionsHtml}

          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
            <button class="pyq-reveal-btn" data-qid="${q.id}">
              <span class="pyq-reveal-icon">💡</span>
              <span class="pyq-reveal-label">${isGlobalShow ? 'Hide Detailed Analysis' : 'Show Answer &amp; Analysis'}</span>
            </button>
            ${q.subTopic ? `<span style="font-size: 12px; font-weight: 600; color: var(--pyq-text-muted);">Sub-topic: <em>${q.subTopic}</em></span>` : ''}
          </div>

          <div class="pyq-analysis-drawer ${isGlobalShow ? 'pyq-open' : ''}" id="drawer-${q.id}">
            <div class="pyq-ans-banner">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 16px;">🎯</span>
                <div class="pyq-ans-badge">Official Key: Option (${String(q.answer).toUpperCase()})</div>
                <span style="font-size: 11px; font-weight: 800; background: rgba(5, 150, 105, 0.18); color: var(--pyq-emerald); padding: 2px 8px; border-radius: 99px; border: 1px solid var(--pyq-emerald-border);">+2.0 Marks</span>
                <span style="font-size: 10.5px; font-weight: 700; color: var(--pyq-text-muted);">-0.66 Neg.</span>
              </div>
              ${q.concept ? `<div class="pyq-concept-badge">💡 Concept: ${q.concept}</div>` : ''}
            </div>

            ${q.explanation ? `<div style="font-size: 14px; line-height: 1.55; color: var(--pyq-text-secondary); margin-bottom: 14px;">${q.explanation}</div>` : ''}
            ${pedagogyHtml}
            ${stmtAnalysisHtml}
            ${optAnalysisHtml}
            ${trapHtml}
            ${factsHtml}
          </div>
        </article>
      `;
    }

    // 9. Card Event Delegation
    function attachQuestionCardEvents(container) {
      // Add to Examples Bank button
      container.querySelectorAll('.pyq-btn-add-example').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const qId = btn.getAttribute('data-qid');
          if (!qId) return;
          if (btn.classList.contains('pyq-is-saved-example')) {
            window.location.href = 'index.html#examples-bank';
          } else {
            saveQuestionToExamples(qId);
          }
        });
      });

      // Option Selection (Mock attempt)
      container.querySelectorAll('.pyq-option-item').forEach(opt => {
        opt.addEventListener('click', (e) => {
          const grid = opt.closest('.pyq-options-grid');
          if (!grid) return;
          const qId = grid.getAttribute('data-qid');
          const key = opt.getAttribute('data-key');
          if (qId && key) {
            state.userAnswers[qId] = { answer: key, updatedAt: Date.now() };
            state.attempted.add(qId);
            state.attemptedMeta[qId] = { active: true, updatedAt: Date.now() };
            saveSet('pyq_attempted', state.attempted);
            saveMeta('pyq_attempted_meta', state.attemptedMeta);
            saveMeta('pyq_answers', state.userAnswers);
            renderHeroStats();
            syncPushPyqData();

            // Auto reveal drawer upon answering
            const drawer = $(`#drawer-${qId}`);
            if (drawer) drawer.classList.add('pyq-open');

            // Refresh card
            const q = state.questions.find(x => x.id === qId);
            if (q) {
              const card = $(`#card-${qId}`);
              if (card) {
                card.outerHTML = renderSingleQuestionCard(q);
                attachQuestionCardEvents(listContainer);
              }
            }
          }
        });
      });

      // Bookmark button
      container.querySelectorAll('.pyq-btn-bookmark').forEach(btn => {
        btn.addEventListener('click', () => {
          const qId = btn.getAttribute('data-qid');
          if (qId) toggleBookmark(qId);
        });
      });

      // Attempt toggle button
      container.querySelectorAll('.pyq-btn-attempt').forEach(btn => {
        btn.addEventListener('click', () => {
          const qId = btn.getAttribute('data-qid');
          if (qId) toggleAttempted(qId);
        });
      });

      // Expand / Collapse Drawer
      container.querySelectorAll('.pyq-reveal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const qId = btn.getAttribute('data-qid');
          const drawer = $(`#drawer-${qId}`);
          if (drawer) {
            const isOpen = drawer.classList.toggle('pyq-open');
            const lbl = btn.querySelector('.pyq-reveal-label');
            if (lbl) lbl.textContent = isOpen ? 'Hide Detailed Analysis' : 'Show Answer & Analysis';
          }
        });
      });
    }

    // 10. Pagination Controls
    function renderPagination(start, end, total, totalPages) {
      const container = $('#pyqPagination');
      if (!container) return;

      if (total <= state.pagination.pageSize) {
        container.style.display = 'none';
        return;
      }
      container.style.display = 'flex';

      container.innerHTML = `
        <button class="pyq-page-btn" id="pyqPrevPage" ${state.pagination.page <= 1 ? 'disabled' : ''}>&larr; Previous</button>
        <span class="pyq-page-info">Showing ${start}–${end} of ${total} PYQs (Page ${state.pagination.page} of ${totalPages})</span>
        <button class="pyq-page-btn" id="pyqNextPage" ${state.pagination.page >= totalPages ? 'disabled' : ''}>Next &rarr;</button>
      `;

      const prevBtn = $('#pyqPrevPage');
      const nextBtn = $('#pyqNextPage');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (state.pagination.page > 1) {
            state.pagination.page--;
            renderQuestionList();
            scrollToTopList();
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (state.pagination.page < totalPages) {
            state.pagination.page++;
            renderQuestionList();
            scrollToTopList();
          }
        });
      }
    }

    function scrollToTopList() {
      const topTarget = $('#pyqFilterPanel') || root;
      topTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 11. Topic Frequency View & Interactive Analytics Dashboard
    function renderTopicFrequencyAnalytics() {
      const analyticsContainer = $('#pyqAnalyticsView');
      if (!analyticsContainer) return;

      const listContainer = $('#pyqQuestionList');
      const pdfContainer = $('#pyqPdfView');
      const paginationContainer = $('#pyqPagination');
      const statusBar = $('#pyqStatusBar');

      if (listContainer) listContainer.style.display = 'none';
      if (pdfContainer) pdfContainer.style.display = 'none';
      if (paginationContainer) paginationContainer.style.display = 'none';
      if (statusBar) statusBar.style.display = 'none';
      analyticsContainer.style.display = 'block';

      if (!state.questions || state.questions.length === 0) {
        analyticsContainer.innerHTML = `
          <div class="pyq-state-box">
            <div class="pyq-spinner"></div>
            <div class="pyq-state-title">Loading Frequency Matrix...</div>
            <div class="pyq-state-desc">Aggregating empirical topic repetitions and annual distribution metrics...</div>
          </div>
        `;
        return;
      }

      const topicStats = {};
      const subTopicStats = {};
      const yearStats = {};
      let statementQuestionsCount = 0;
      let recentYearsCount = 0;
      const totalCount = state.questions.length || 1;

      state.questions.forEach(q => {
        // Topic aggregation
        const t = q.topic || 'General';
        if (!topicStats[t]) {
          topicStats[t] = { topic: t, name: t, count: 0, years: new Set(), subTopics: new Set() };
        }
        topicStats[t].count++;
        if (q.year) {
          topicStats[t].years.add(q.year);
          yearStats[q.year] = (yearStats[q.year] || 0) + 1;
          if (q.year >= 2013) recentYearsCount++;
        }
        if (q.subTopic) topicStats[t].subTopics.add(q.subTopic);

        // Subtopic aggregation
        let st = q.subTopic;
        if (!st || st === 'Other' || st === 'General') {
          if (q.concept) st = q.concept;
          else st = q.topic || 'General Studies';
        }
        st = st.replace(/\s*\(State PCS[^)]*\)/gi, '').trim();
        if (!subTopicStats[st]) {
          subTopicStats[st] = { name: st, topic: q.topic, count: 0, years: new Set() };
        }
        subTopicStats[st].count++;
        if (q.year) subTopicStats[st].years.add(q.year);

        if (q.type === 'statement-based' || (Array.isArray(q.statements) && q.statements.length > 0)) {
          statementQuestionsCount++;
        }
      });

      let topicList = Object.values(topicStats);
      let subTopicList = Object.values(subTopicStats).sort((a, b) => b.count - a.count);

      // Sort topics
      if (state.sortFreqBy === 'topic') {
        topicList.sort((a, b) => state.sortFreqAsc ? a.topic.localeCompare(b.topic) : b.topic.localeCompare(a.topic));
      } else {
        topicList.sort((a, b) => state.sortFreqAsc ? a.count - b.count : b.count - a.count);
      }

      const top3Count = topicList.slice(0, 3).reduce((sum, item) => sum + item.count, 0);
      const top3Pct = Math.round((top3Count / totalCount) * 100);
      const stmtPct = Math.round((statementQuestionsCount / totalCount) * 100);
      const recentPct = Math.round((recentYearsCount / totalCount) * 100);

      // 1. KPI Cards HTML
      const kpisHtml = `
        <div class="pyq-analytics-kpis">
          <div class="pyq-kpi-card">
            <div class="pyq-kpi-top">
              <span class="pyq-kpi-icon">📊</span>
              <span class="pyq-kpi-chip" style="background:var(--pyq-primary-soft); color:var(--pyq-primary);">Archive</span>
            </div>
            <div class="pyq-kpi-val">${totalCount.toLocaleString()}</div>
            <div class="pyq-kpi-lbl">Total ${getSubjectName(state.currentSubjectId)} PYQs</div>
          </div>

          <div class="pyq-kpi-card">
            <div class="pyq-kpi-top">
              <span class="pyq-kpi-icon">🏆</span>
              <span class="pyq-kpi-chip" style="background:var(--pyq-amber-soft); color:var(--pyq-amber);">Core Yield</span>
            </div>
            <div class="pyq-kpi-val">${top3Pct}%</div>
            <div class="pyq-kpi-lbl">Top 3 Topics Concentration</div>
          </div>

          <div class="pyq-kpi-card">
            <div class="pyq-kpi-top">
              <span class="pyq-kpi-icon">🧩</span>
              <span class="pyq-kpi-chip" style="background:var(--pyq-purple-soft); color:var(--pyq-purple);">Format</span>
            </div>
            <div class="pyq-kpi-val">${stmtPct}%</div>
            <div class="pyq-kpi-lbl">Statement-Based Questions</div>
          </div>

          <div class="pyq-kpi-card">
            <div class="pyq-kpi-top">
              <span class="pyq-kpi-icon">⚡</span>
              <span class="pyq-kpi-chip" style="background:var(--pyq-emerald-soft); color:var(--pyq-emerald);">Recency</span>
            </div>
            <div class="pyq-kpi-val">${recentPct}%</div>
            <div class="pyq-kpi-lbl">2013–2024 Question Share</div>
          </div>
        </div>
      `;

      // 2. Interactive SVG Pie/Donut Chart Component
      const PIE_COLORS = [
        '#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626',
        '#0891B2', '#EA580C', '#4F46E5', '#0D9488', '#65A30D',
        '#DB2777', '#64748B'
      ];

      const isSubMode = state.pieMode === 'subtopics';
      const rawList = isSubMode ? subTopicList : topicList;
      const topRepeater = rawList[0] || { name: 'General', count: totalCount, years: new Set() };
      const topRepeaterPct = ((topRepeater.count / totalCount) * 100).toFixed(1);
      const topRepeaterYears = topRepeater.years ? topRepeater.years.size : 1;

      // Prepare slices for Pie Chart (Top 8 + Others if more)
      let chartItems = [];
      if (rawList.length <= 9) {
        chartItems = rawList.map((item, idx) => ({
          name: item.name || item.topic,
          count: item.count,
          pct: (item.count / totalCount) * 100,
          filterVal: item.name || item.topic,
          isSub: isSubMode,
          color: PIE_COLORS[idx % PIE_COLORS.length]
        }));
      } else {
        const top8 = rawList.slice(0, 8);
        top8.forEach((item, idx) => {
          chartItems.push({
            name: item.name || item.topic,
            count: item.count,
            pct: (item.count / totalCount) * 100,
            filterVal: item.name || item.topic,
            isSub: isSubMode,
            color: PIE_COLORS[idx % PIE_COLORS.length]
          });
        });
        const rest = rawList.slice(8);
        const othersCount = rest.reduce((s, it) => s + it.count, 0);
        chartItems.push({
          name: `Others (${rest.length} ${isSubMode ? 'themes' : 'topics'})`,
          count: othersCount,
          pct: (othersCount / totalCount) * 100,
          filterVal: 'OTHERS',
          isSub: isSubMode,
          color: PIE_COLORS[PIE_COLORS.length - 1]
        });
      }

      // Generate SVG Pie Slices
      const R = 145; // outer radius
      const r = 90;  // inner donut radius
      let currentAngle = -Math.PI / 2;

      const svgSlicesHtml = chartItems.map((item, idx) => {
        const sliceAngle = (item.count / totalCount) * 2 * Math.PI;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sliceAngle;
        currentAngle = endAngle;

        const x1 = (R * Math.cos(startAngle)).toFixed(2);
        const y1 = (R * Math.sin(startAngle)).toFixed(2);
        const x2 = (R * Math.cos(endAngle)).toFixed(2);
        const y2 = (R * Math.sin(endAngle)).toFixed(2);

        const ix1 = (r * Math.cos(endAngle)).toFixed(2);
        const iy1 = (r * Math.sin(endAngle)).toFixed(2);
        const ix2 = (r * Math.cos(startAngle)).toFixed(2);
        const iy2 = (r * Math.sin(startAngle)).toFixed(2);

        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        const pathD = [
          `M ${x1} ${y1}`,
          `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
          `L ${ix1} ${iy1}`,
          `A ${r} ${r} 0 ${largeArc} 0 ${ix2} ${iy2}`,
          'Z'
        ].join(' ');

        return `
          <path class="pyq-pie-slice"
                d="${pathD}"
                fill="${item.color}"
                data-idx="${idx}"
                data-name="${encodeURIComponent(item.name)}"
                data-count="${item.count}"
                data-pct="${item.pct.toFixed(1)}"
                data-filter="${encodeURIComponent(item.filterVal)}"
                data-issub="${item.isSub}"
                stroke="var(--pyq-bg-card, #FFFFFF)"
                stroke-width="2.5">
          </path>
        `;
      }).join('');

      // Generate Legend Items
      const legendItemsHtml = chartItems.map((item, idx) => {
        const pctStr = item.pct.toFixed(1);
        const isOthers = item.filterVal === 'OTHERS';
        return `
          <div class="pyq-pie-legend-item" data-idx="${idx}" data-filter="${encodeURIComponent(item.filterVal)}" data-issub="${item.isSub}">
            <div class="pyq-legend-dot" style="background:${item.color};"></div>
            <div class="pyq-legend-info">
              <div class="pyq-legend-name" title="${item.name}">${item.name}</div>
              <div class="pyq-legend-bar-wrap">
                <div class="pyq-legend-bar" style="width:${Math.max(4, item.pct)}%; background:${item.color};"></div>
              </div>
            </div>
            <div class="pyq-legend-stats">
              <span class="pyq-legend-count">${item.count} Qs</span>
              <span class="pyq-legend-pct">${pctStr}%</span>
              ${!isOthers ? `<button type="button" class="pyq-legend-btn" data-filter="${encodeURIComponent(item.filterVal)}" data-issub="${item.isSub}">Explore &rarr;</button>` : ''}
            </div>
          </div>
        `;
      }).join('');

      const pieChartHtml = `
        <div class="pyq-pie-section">
          <div class="pyq-pie-header">
            <div>
              <div class="pyq-chart-heading" style="margin-bottom: 3px;">
                <span>🥧 Empirical Frequency &amp; Weightage Pie Chart</span>
                <span class="pyq-pie-live-badge">Live Analytics</span>
              </div>
              <div style="font-size: 12.5px; color: var(--pyq-text-muted); font-weight: 600;">
                Empirical repetition breakdown across all ${totalCount} PYQs in ${getSubjectName(state.currentSubjectId)}
              </div>
            </div>

            <div class="pyq-pie-mode-toggle">
              <button type="button" class="pyq-pie-toggle-btn ${!isSubMode ? 'active' : ''}" data-piemode="topics">
                🎯 Core Syllabus Topics (${topicList.length})
              </button>
              <button type="button" class="pyq-pie-toggle-btn ${isSubMode ? 'active' : ''}" data-piemode="subtopics">
                🔥 Top Repeating Themes (${subTopicList.length})
              </button>
            </div>
          </div>

          <!-- Highlight Banner: #1 Most Repeated -->
          <div class="pyq-top-repeater-banner">
            <div class="pyq-repeater-icon">🔥</div>
            <div class="pyq-repeater-content">
              <div class="pyq-repeater-headline">
                <span class="pyq-repeater-tag">#1 Most Repeated ${isSubMode ? 'Theme' : 'Topic'}</span>
                <span class="pyq-repeater-name" title="${topRepeater.name}">${topRepeater.name}</span>
              </div>
              <div class="pyq-repeater-meta">
                <strong>${topRepeater.count} Questions</strong> (${topRepeaterPct}% weightage) repeating across <strong>${topRepeaterYears} distinct UPSC exam years</strong>. High-yield core priority for revision.
              </div>
            </div>
            <button type="button" class="pyq-topic-filter-btn pyq-repeater-action-btn" data-filter="${encodeURIComponent(topRepeater.name || topRepeater.topic)}" data-issub="${isSubMode}">
              Explore ${topRepeater.count} Qs &rarr;
            </button>
          </div>

          <!-- Donut SVG & Legend 2-Column Grid -->
          <div class="pyq-pie-grid">
            <div class="pyq-pie-canvas-col">
              <div class="pyq-pie-svg-wrapper">
                <svg viewBox="0 0 360 360" class="pyq-pie-svg" id="pyqDonutSvg">
                  <g transform="translate(180, 180)">
                    ${svgSlicesHtml}
                  </g>
                </svg>
                <div class="pyq-pie-center-info" id="pyqPieCenterInfo">
                  <div class="pyq-pie-center-val" id="pyqCenterVal">${totalCount}</div>
                  <div class="pyq-pie-center-lbl" id="pyqCenterLbl">Total Questions</div>
                  <div class="pyq-pie-center-sub" id="pyqCenterSub">1993–2024 Exam Matrix</div>
                </div>
              </div>
              <div class="pyq-pie-hint">💡 Hover slice or legend item for details • Click to filter questions</div>
            </div>

            <div class="pyq-pie-legend-col">
              <div class="pyq-pie-legend-list">
                ${legendItemsHtml}
              </div>
            </div>
          </div>
        </div>
      `;

      // 3. Year-by-Year Trend Bar Matrix (2013 to 2024)
      const trendYears = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
      const maxYearCount = trendYears.reduce((m, y) => Math.max(m, yearStats[y] || 0), 1);

      const yearBarsHtml = trendYears.map(y => {
        const cnt = yearStats[y] || 0;
        const heightPct = Math.max(10, Math.round((cnt / maxYearCount) * 100));
        const isSelected = String(state.filters.year) === String(y);

        return `
          <div class="pyq-year-bar-col" data-year="${y}" title="Click to filter ${cnt} questions from ${y}">
            <div class="pyq-year-val-tip">${cnt} Qs</div>
            <div class="pyq-year-bar ${isSelected ? 'pyq-bar-highlight' : ''}" style="height:${heightPct}%;"></div>
            <span class="pyq-year-lbl">'${String(y).slice(2)}</span>
          </div>
        `;
      }).join('');

      const yearTrendHtml = `
        <div class="pyq-year-trend-wrap">
          <div class="pyq-chart-heading">
            <span>📈 Annual Question Frequency Distribution (2013–2024)</span>
            <span style="font-size:11.5px; font-weight:600; color:var(--pyq-text-muted);">💡 Click any bar to drill down into that year's questions</span>
          </div>
          <div class="pyq-year-bars-container">
            ${yearBarsHtml}
          </div>
        </div>
      `;

      // 4. Top Ranked Topic Cards (Top 6)
      const topRanked = topicList.slice(0, 6);
      const rankedCardsHtml = `
        <div style="margin-bottom: 24px;">
          <div class="pyq-chart-heading">
            <span>🎯 High-Yield Syllabus Topics Leaderboard</span>
            <span style="font-size:11.5px; font-weight:600; color:var(--pyq-text-muted);">Ranked by historical frequency</span>
          </div>
          <div class="pyq-ranked-topics-list">
            ${topRanked.map((item, idx) => {
              const rank = idx + 1;
              const rankClass = rank === 1 ? 'pyq-rank-1' : (rank === 2 ? 'pyq-rank-2' : (rank === 3 ? 'pyq-rank-3' : 'pyq-rank-other'));
              const medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : `#${rank}`));
              const weightage = Math.round((item.count / totalCount) * 100);

              return `
                <div class="pyq-ranked-topic-item">
                  <div class="pyq-rank-badge ${rankClass}">${medal}</div>
                  <div class="pyq-ranked-topic-body">
                    <div class="pyq-ranked-topic-title" title="${item.topic}">${item.topic}</div>
                    <div class="pyq-ranked-topic-bar">
                      <div class="pyq-ranked-topic-fill" style="width:${weightage}%;"></div>
                    </div>
                  </div>
                  <div class="pyq-ranked-topic-meta">
                    <span class="pyq-count-badge">${item.count} Qs</span>
                    <span class="pyq-weightage-pill">${weightage}%</span>
                    <button type="button" class="pyq-topic-filter-btn" data-topic="${encodeURIComponent(item.topic)}">
                      Explore Qs &rarr;
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // 5. Complete Topic Frequency Table HTML
      const tableRows = topicList.map((item, idx) => {
        const sortedYears = Array.from(item.years).sort((a, b) => b - a);
        const weightage = Math.round((item.count / totalCount) * 100);
        const rank = idx + 1;
        const medal = rank === 1 ? '🥇 #1' : (rank === 2 ? '🥈 #2' : (rank === 3 ? '🥉 #3' : `#${rank}`));

        return `
          <tr class="pyq-freq-row" data-topic="${encodeURIComponent(item.topic)}" style="cursor:pointer;" title="Click row to filter questions for ${item.topic}">
            <td style="font-weight:800; color:var(--pyq-text-muted); font-size:12px;">${medal}</td>
            <td style="font-weight: 700; color: var(--pyq-text-primary);">${item.topic}</td>
            <td style="font-weight: 800; color: var(--pyq-primary); font-size:14px;">${item.count}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="flex: 1; height: 6px; background: var(--pyq-border); border-radius: 99px; overflow: hidden; max-width: 90px;">
                  <div style="width: ${weightage}%; height: 100%; background: linear-gradient(90deg, #3B82F6, #10B981);"></div>
                </div>
                <span style="font-weight:700; font-size:12px;">${weightage}%</span>
              </div>
            </td>
            <td style="color: var(--pyq-text-secondary); font-size: 12px; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${sortedYears.slice(0, 8).join(', ')}${sortedYears.length > 8 ? '…' : ''}
            </td>
            <td>
              <button type="button" class="pyq-topic-filter-btn" data-topic="${encodeURIComponent(item.topic)}">
                View
              </button>
            </td>
          </tr>
        `;
      }).join('');

      analyticsContainer.innerHTML = `
        <div class="pyq-analytics-card">
          <div class="pyq-analytics-header">
            <div>
              <div class="pyq-analytics-title">
                <span>📊</span>
                <span>Topic Frequency &amp; Weightage Matrix</span>
              </div>
              <div class="pyq-analytics-sub">Empirical analysis across ${totalCount} questions in ${getSubjectName(state.currentSubjectId)}</div>
            </div>
            <button type="button" class="pyq-topic-filter-btn" id="pyqBackToQuestionsBtn" style="padding:8px 16px;">
              &larr; Back to Questions View
            </button>
          </div>

          ${kpisHtml}
          ${pieChartHtml}
          ${yearTrendHtml}
          ${rankedCardsHtml}

          <div class="pyq-chart-heading">
            <span>📋 Complete Topic Frequency &amp; Year Ledger</span>
            <span style="font-size:11.5px; font-weight:600; color:var(--pyq-text-muted);">Click any row or topic button to filter</span>
          </div>

          <div class="pyq-table-scroll-hint"><span>⇄ Swipe table horizontally for all years &amp; ranks</span></div>

          <div class="pyq-freq-table-wrap">
            <table class="pyq-freq-table">
              <thead>
                <tr>
                  <th style="width:60px;">Rank</th>
                  <th id="pyqSortTopic">Topic Name ⇕</th>
                  <th id="pyqSortCount">Questions ⇕</th>
                  <th>Weightage</th>
                  <th>Recent Years Asked</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Event Listeners for Pie Mode Toggle (Topics vs Subtopics)
      analyticsContainer.querySelectorAll('.pyq-pie-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-piemode');
          if (mode && mode !== state.pieMode) {
            state.pieMode = mode;
            renderTopicFrequencyAnalytics();
          }
        });
      });

      // Filter trigger helper from pie chart or legend
      function triggerFilterFromPie(filterVal, isSub) {
        if (!filterVal || filterVal === 'OTHERS') return;
        if (isSub === true || isSub === 'true') {
          state.filters.searchQuery = filterVal;
          const sInput = $('#pyqSearchInput');
          if (sInput) sInput.value = filterVal;
        } else {
          state.filters.topic = filterVal;
          const tSelect = $('#pyqFilterTopic');
          if (tSelect) tSelect.value = filterVal;
        }
        switchToQuestionsView();
      }

      // Event Listeners for Pie Slices (Hover & Click)
      const centerVal = $('#pyqCenterVal');
      const centerLbl = $('#pyqCenterLbl');
      const centerSub = $('#pyqCenterSub');

      analyticsContainer.querySelectorAll('.pyq-pie-slice').forEach(slice => {
        const rawName = decodeURIComponent(slice.getAttribute('data-name') || '');
        const count = slice.getAttribute('data-count') || '';
        const pct = slice.getAttribute('data-pct') || '';
        const filterVal = decodeURIComponent(slice.getAttribute('data-filter') || '');
        const isSub = slice.getAttribute('data-issub');
        const sliceIdx = slice.getAttribute('data-idx');

        slice.addEventListener('mouseenter', () => {
          slice.classList.add('slice-hover');
          if (centerVal) { centerVal.textContent = count + ' Qs'; centerVal.style.color = slice.getAttribute('fill'); }
          if (centerLbl) centerLbl.textContent = pct + '% Share';
          if (centerSub) centerSub.textContent = rawName;

          const legendItem = analyticsContainer.querySelector(`.pyq-pie-legend-item[data-idx="${sliceIdx}"]`);
          if (legendItem) legendItem.classList.add('legend-hover');
        });

        slice.addEventListener('mouseleave', () => {
          slice.classList.remove('slice-hover');
          if (centerVal) { centerVal.textContent = totalCount; centerVal.style.color = ''; }
          if (centerLbl) centerLbl.textContent = 'Total Questions';
          if (centerSub) centerSub.textContent = '1993–2024 Exam Matrix';

          const legendItem = analyticsContainer.querySelector(`.pyq-pie-legend-item[data-idx="${sliceIdx}"]`);
          if (legendItem) legendItem.classList.remove('legend-hover');
        });

        slice.addEventListener('click', () => {
          triggerFilterFromPie(filterVal, isSub);
        });
      });

      // Event Listeners for Legend Items
      analyticsContainer.querySelectorAll('.pyq-pie-legend-item').forEach(item => {
        const sliceIdx = item.getAttribute('data-idx');
        const filterVal = decodeURIComponent(item.getAttribute('data-filter') || '');
        const isSub = item.getAttribute('data-issub');
        const slice = analyticsContainer.querySelector(`.pyq-pie-slice[data-idx="${sliceIdx}"]`);

        item.addEventListener('mouseenter', () => {
          item.classList.add('legend-hover');
          if (slice) {
            slice.classList.add('slice-hover');
            const count = slice.getAttribute('data-count') || '';
            const pct = slice.getAttribute('data-pct') || '';
            const rawName = decodeURIComponent(slice.getAttribute('data-name') || '');
            if (centerVal) { centerVal.textContent = count + ' Qs'; centerVal.style.color = slice.getAttribute('fill'); }
            if (centerLbl) centerLbl.textContent = pct + '% Share';
            if (centerSub) centerSub.textContent = rawName;
          }
        });

        item.addEventListener('mouseleave', () => {
          item.classList.remove('legend-hover');
          if (slice) slice.classList.remove('slice-hover');
          if (centerVal) { centerVal.textContent = totalCount; centerVal.style.color = ''; }
          if (centerLbl) centerLbl.textContent = 'Total Questions';
          if (centerSub) centerSub.textContent = '1993–2024 Exam Matrix';
        });

        item.addEventListener('click', (e) => {
          if (!e.target.closest('.pyq-legend-btn')) {
            triggerFilterFromPie(filterVal, isSub);
          }
        });
      });

      analyticsContainer.querySelectorAll('.pyq-legend-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const filterVal = decodeURIComponent(btn.getAttribute('data-filter') || '');
          const isSub = btn.getAttribute('data-issub');
          triggerFilterFromPie(filterVal, isSub);
        });
      });

      const repeaterBtn = analyticsContainer.querySelector('.pyq-repeater-action-btn');
      if (repeaterBtn) {
        repeaterBtn.addEventListener('click', () => {
          const filterVal = decodeURIComponent(repeaterBtn.getAttribute('data-filter') || '');
          const isSub = repeaterBtn.getAttribute('data-issub');
          triggerFilterFromPie(filterVal, isSub);
        });
      }

      // Event Listeners for Year Bars (Drill down)
      analyticsContainer.querySelectorAll('.pyq-year-bar-col').forEach(col => {
        col.addEventListener('click', () => {
          const y = col.getAttribute('data-year');
          if (y) {
            state.filters.year = y;
            const ySelect = $('#pyqFilterYear');
            if (ySelect) ySelect.value = y;
            switchToQuestionsView();
          }
        });
      });

      // Event Listeners for Topic Filter Buttons & Rows
      analyticsContainer.querySelectorAll('.pyq-topic-filter-btn:not(.pyq-repeater-action-btn)').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tRaw = btn.getAttribute('data-topic');
          if (tRaw) {
            const topic = decodeURIComponent(tRaw);
            state.filters.topic = topic;
            const tSelect = $('#pyqFilterTopic');
            if (tSelect) tSelect.value = topic;
            switchToQuestionsView();
          }
        });
      });

      analyticsContainer.querySelectorAll('.pyq-freq-row').forEach(row => {
        row.addEventListener('click', () => {
          const tRaw = row.getAttribute('data-topic');
          if (tRaw) {
            const topic = decodeURIComponent(tRaw);
            state.filters.topic = topic;
            const tSelect = $('#pyqFilterTopic');
            if (tSelect) tSelect.value = topic;
            switchToQuestionsView();
          }
        });
      });

      // Back to Questions button
      const backBtn = $('#pyqBackToQuestionsBtn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          switchToQuestionsView();
        });
      }

      // Sorting event listeners
      const sortTopicEl = $('#pyqSortTopic');
      const sortCountEl = $('#pyqSortCount');

      if (sortTopicEl) {
        sortTopicEl.addEventListener('click', () => {
          if (state.sortFreqBy === 'topic') {
            state.sortFreqAsc = !state.sortFreqAsc;
          } else {
            state.sortFreqBy = 'topic';
            state.sortFreqAsc = true;
          }
          renderTopicFrequencyAnalytics();
        });
      }

      if (sortCountEl) {
        sortCountEl.addEventListener('click', () => {
          if (state.sortFreqBy === 'count') {
            state.sortFreqAsc = !state.sortFreqAsc;
          } else {
            state.sortFreqBy = 'count';
            state.sortFreqAsc = false;
          }
          renderTopicFrequencyAnalytics();
        });
      }
    }

    function switchToQuestionsView() {
      state.currentView = 'questions';
      state.pagination.page = 1;
      const qBtn = $('#pyqViewQuestions');
      const aBtn = $('#pyqViewAnalytics');
      const pBtn = $('#pyqViewPdfs');
      const zBtn = $('#pyqViewQuiz');
      if (qBtn) qBtn.classList.add('pyq-active');
      if (aBtn) aBtn.classList.remove('pyq-active');
      if (pBtn) pBtn.classList.remove('pyq-active');
      if (zBtn) zBtn.classList.remove('pyq-active');
      applyFiltersAndRender();
      scrollToTopList();
    }

    // 12. Original PDF Question Bank Viewer
    function renderPdfArchivesView() {
      const listContainer = $('#pyqQuestionList');
      const analyticsContainer = $('#pyqAnalyticsView');
      const paginationContainer = $('#pyqPagination');
      const pdfContainer = $('#pyqPdfView');
      const statusBar = $('#pyqStatusBar');

      if (listContainer) listContainer.style.display = 'none';
      if (analyticsContainer) analyticsContainer.style.display = 'none';
      if (paginationContainer) paginationContainer.style.display = 'none';
      if (statusBar) statusBar.style.display = 'none';
      if (!pdfContainer) return;

      pdfContainer.style.display = 'block';

      let activePdf = PDF_CATALOG.find(p => p.id === state.activePdfId);
      if (!activePdf) {
        activePdf = PDF_CATALOG[0];
        state.activePdfId = activePdf.id;
      }

      pdfContainer.innerHTML = `
        <div class="pyq-pdf-section">
          <div class="pyq-pdf-header">
            <div class="pyq-pdf-header-top">
              <div class="pyq-pdf-title">
                <span>📚</span>
                <span>UPSC Prelims Complete Question Bank Compilations</span>
              </div>
              <div class="pyq-pdf-badge-total">6 Core Subjects • 2,376 Scanned Pages • 1.18 GB</div>
            </div>
            <div class="pyq-pdf-desc">
              High-resolution authentic scans of complete UPSC Prelims question papers and detailed bilingual explanations. Select any subject below to stream and read instantly with zero lag.
            </div>

            <div class="pyq-pdf-grid">
              ${PDF_CATALOG.map(pdf => `
                <button class="pyq-pdf-card ${pdf.id === state.activePdfId ? 'pyq-active' : ''}" data-pdf-id="${pdf.id}">
                  <div class="pyq-pdf-card-top">
                    <span class="pyq-pdf-card-icon">${pdf.icon}</span>
                    <span class="pyq-pdf-card-name">${pdf.subject}</span>
                  </div>
                  <div class="pyq-pdf-card-meta">
                    <span class="pyq-pdf-card-tag">📄 ${pdf.pages} Pages</span>
                    <span class="pyq-pdf-card-tag">💾 ${pdf.size}</span>
                  </div>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="pyq-pdf-viewer-wrap">
            <div class="pyq-pdf-toolbar">
              <div class="pyq-pdf-toolbar-info">
                <span>${activePdf.icon}</span>
                <span>${activePdf.subject} (${activePdf.pages} Pages)</span>
                <span class="pyq-badge" style="background:var(--pyq-success-soft); color:var(--pyq-success); font-size:11px; padding:2px 8px; border-radius:999px;">✓ HTTP 206 Streaming</span>
              </div>
              <div class="pyq-pdf-actions">
                <a href="pdf_inputs/${activePdf.file}" target="_blank" class="pyq-pdf-action-btn pyq-primary" title="Open PDF in Full Screen Tab">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  <span>Open Full Window</span>
                </a>
                <a href="pdf_inputs/${activePdf.file}" download="${activePdf.file}" class="pyq-pdf-action-btn" title="Download original PDF">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>Download (${activePdf.size})</span>
                </a>
              </div>
            </div>

            <iframe 
              src="pdf_inputs/${activePdf.file}#view=FitH&toolbar=1" 
              class="pyq-pdf-frame" 
              title="${activePdf.subject} UPSC Prelims PYQ Document Viewer"
              loading="lazy"
            ></iframe>
          </div>
        </div>
      `;

      // Attach click events on PDF selector cards
      pdfContainer.querySelectorAll('.pyq-pdf-card').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-pdf-id');
          if (id && id !== state.activePdfId) {
            state.activePdfId = id;
            renderPdfArchivesView();
          }
        });
      });
    }


    // =========================================================================
    // DAILY 20-QUESTION MIXED PYQ QUIZ & PERFORMANCE ANALYTICS ENGINE
    // =========================================================================

    function mulberry32(a) {
      return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    function getDailySeed(dateStr) {
      let h = 0;
      for (let i = 0; i < dateStr.length; i++) {
        h = Math.imul(31, h) + dateStr.charCodeAt(i) | 0;
      }
      return h >>> 0;
    }

    function getLocalDateStr(d) {
      const dt = d ? new Date(d) : new Date();
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    function formatQuizTime(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function getQuizRecordForDate(dateStr) {
      if (!Array.isArray(state.quizHistory)) return null;
      return state.quizHistory.find(q => q.date === dateStr) || null;
    }

    async function ensureSubjectQuestions(subjectId) {
      if (state.subjectCache[subjectId]) {
        const data = state.subjectCache[subjectId];
        return Array.isArray(data.questions) ? data.questions : (Array.isArray(data) ? data : []);
      }
      try {
        const res = await fetch(`pyq-data/${subjectId}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        state.subjectCache[subjectId] = data;
        return Array.isArray(data.questions) ? data.questions : (Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn(`[PYQ Quiz] Failed to load ${subjectId}:`, e);
        return [];
      }
    }

    async function generateDailyQuizQuestions(dateStr) {
      const cacheKey = 'pyq_daily_quiz_cache_' + dateStr;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length === 20) {
            return parsed;
          }
        }
      } catch (e) {}

      // Distribution across all 8,265+ questions:
      // Polity: 4, Economy: 4, History: 4, Geography: 3, Environment: 3, Science-Tech: 2 = 20 Qs
      const plan = [
        { subject: 'polity', count: 4 },
        { subject: 'economy', count: 4 },
        { subject: 'history', count: 4 },
        { subject: 'geography', count: 3 },
        { subject: 'environment', count: 3 },
        { subject: 'science-tech', count: 2 }
      ];

      const rand = mulberry32(getDailySeed(dateStr));
      const allSubjectData = await Promise.all(plan.map(p => ensureSubjectQuestions(p.subject)));

      const selected = [];
      plan.forEach((p, idx) => {
        const qs = allSubjectData[idx] || [];
        if (!qs.length) return;
        const picked = new Set();
        let attempts = 0;
        while (picked.size < p.count && attempts < 150) {
          attempts++;
          const rIdx = Math.floor(rand() * qs.length);
          picked.add(rIdx);
        }
        picked.forEach(rIdx => {
          selected.push(qs[rIdx]);
        });
      });

      // Seeded Fisher-Yates shuffle for mixed exam feel
      for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const temp = selected[i];
        selected[i] = selected[j];
        selected[j] = temp;
      }

      try {
        localStorage.setItem(cacheKey, JSON.stringify(selected));
      } catch (e) {}

      return selected;
    }

    function calculateDailyStreak(history) {
      if (!Array.isArray(history) || history.length === 0) return 0;
      const dateSet = new Set(history.map(h => h.date));
      const today = new Date();
      let streak = 0;
      let checkDate = new Date(today);

      // If today not done, start check from yesterday
      const todayStr = getLocalDateStr(today);
      if (!dateSet.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
        const str = getLocalDateStr(checkDate);
        if (dateSet.has(str)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    }

    function renderQuizView() {
      const quizContainer = $('#pyqQuizView');
      if (!quizContainer) return;

      const listContainer = $('#pyqQuestionList');
      const analyticsContainer = $('#pyqAnalyticsView');
      const pdfContainer = $('#pyqPdfView');
      const paginationContainer = $('#pyqPagination');
      const statusBar = $('#pyqStatusBar');
      const filterPanel = $('#pyqFilterPanel');
      const subjectBanner = $('#pyqSubjectBanner');

      if (listContainer) listContainer.style.display = 'none';
      if (analyticsContainer) analyticsContainer.style.display = 'none';
      if (pdfContainer) pdfContainer.style.display = 'none';
      if (paginationContainer) paginationContainer.style.display = 'none';
      if (statusBar) statusBar.style.display = 'none';
      if (filterPanel) filterPanel.style.display = 'none';
      if (subjectBanner) subjectBanner.style.display = 'none';

      quizContainer.style.display = 'block';

      // Restore session if active
      if (!state.activeQuiz) {
        try {
          const savedActive = localStorage.getItem('pyq_active_quiz_session');
          if (savedActive) {
            const parsed = JSON.parse(savedActive);
            if (parsed && parsed.dateStr && Array.isArray(parsed.questions) && parsed.questions.length === 20 && parsed.status === 'in_progress') {
              state.activeQuiz = parsed;
              state.activeQuiz.flags = new Set(parsed.flags || []);
              startQuizTimer();
            }
          }
        } catch (e) {}
      }

      renderQuizContainerMarkup(quizContainer);
    }

    function renderQuizContainerMarkup(container) {
      const todayStr = getLocalDateStr();
      const todayRecord = getQuizRecordForDate(todayStr);

      container.innerHTML = `
        <div class="pyq-quiz-header">
          <div class="pyq-quiz-header-top">
            <div class="pyq-quiz-title-wrap">
              <div class="pyq-quiz-badge">⚡ Daily UPSC Prelims Challenge</div>
              <h2 class="pyq-quiz-heading">20 Questions Mixed PYQ Challenge</h2>
              <p class="pyq-quiz-subheading">
                A fresh, balanced 20-question mock automatically drawn from all 8,265+ previous year questions (Polity, Economy, History, Geography, Environment, Science &amp; Tech). Generates a unique daily test every day with UPSC negative marking (+2.0 / -0.66).
              </p>
            </div>
            <div class="pyq-quiz-nav-tabs" role="tablist">
              <button type="button" class="pyq-quiz-nav-tab ${state.quizTab === 'take' ? 'pyq-active' : ''}" data-quiz-tab="take">
                <span>⚡</span>
                <span>${state.activeQuiz && state.activeQuiz.status === 'in_progress' ? 'Exam in Progress' : "Today's Quiz"}</span>
                ${todayRecord ? '<span style="font-size:10px; background:var(--pyq-emerald-soft); color:var(--pyq-emerald); padding:1px 6px; border-radius:999px;">✓ Done</span>' : ''}
              </button>
              <button type="button" class="pyq-quiz-nav-tab ${state.quizTab === 'results' ? 'pyq-active' : ''}" data-quiz-tab="results">
                <span>📊</span>
                <span>Performance Graphs</span>
                <span style="font-size:10px; background:var(--pyq-bg-subtle); color:var(--pyq-text-muted); padding:1px 6px; border-radius:999px;">${state.quizHistory.length}</span>
              </button>
              <button type="button" class="pyq-quiz-nav-tab ${state.quizTab === 'history' ? 'pyq-active' : ''}" data-quiz-tab="history">
                <span>📜</span>
                <span>Archive</span>
              </button>
            </div>
          </div>
        </div>

        <div id="pyqQuizTabContent"></div>
      `;

      container.querySelectorAll('.pyq-quiz-nav-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-quiz-tab');
          if (tab && tab !== state.quizTab) {
            state.quizTab = tab;
            container.querySelectorAll('.pyq-quiz-nav-tab').forEach(b => {
              b.classList.toggle('pyq-active', b.getAttribute('data-quiz-tab') === tab);
            });
            renderQuizTabContent();
          }
        });
      });

      renderQuizTabContent();
    }

    function renderQuizTabContent() {
      const contentEl = $('#pyqQuizTabContent');
      if (!contentEl) return;

      const todayStr = getLocalDateStr();
      const todayRecord = getQuizRecordForDate(todayStr);

      if (state.quizTab === 'take') {
        if (state.activeQuiz && state.activeQuiz.status === 'in_progress') {
          renderActiveQuizExam(contentEl);
        } else if (todayRecord && !state.activeQuiz) {
          renderCompletedTodayCard(contentEl, todayRecord);
        } else {
          renderStartQuizCard(contentEl, todayStr);
        }
      } else if (state.quizTab === 'results') {
        renderQuizAnalyticsAndGraphs(contentEl);
      } else if (state.quizTab === 'history') {
        renderQuizHistoryArchive(contentEl);
      }
    }

    // --- Sub-View: Start Card ---
    function renderStartQuizCard(container, dateStr) {
      const dateFormatted = new Date(dateStr).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      container.innerHTML = `
        <div class="pyq-quiz-start-card">
          <div class="pyq-quiz-start-icon">⚡</div>
          <h3 class="pyq-quiz-start-title">UPSC Prelims Daily Challenge</h3>
          <div class="pyq-quiz-start-date">📅 ${dateFormatted}</div>
          <p style="font-size:14px; color:var(--pyq-text-muted); max-width:600px; margin:0 auto 20px auto; line-height:1.5;">
            Test your active recall across 20 curated questions randomly drawn from all 8,265+ questions in the archive. Your answers, scores, and accuracy trends are saved and graphed automatically.
          </p>

          <div class="pyq-quiz-dist-grid">
            <div class="pyq-quiz-dist-item">
              <div class="pyq-quiz-dist-name">⚖️ Polity</div>
              <div class="pyq-quiz-dist-val">4 Qs</div>
            </div>
            <div class="pyq-quiz-dist-item">
              <div class="pyq-quiz-dist-name">📈 Economy</div>
              <div class="pyq-quiz-dist-val">4 Qs</div>
            </div>
            <div class="pyq-quiz-dist-item">
              <div class="pyq-quiz-dist-name">🏛️ History</div>
              <div class="pyq-quiz-dist-val">4 Qs</div>
            </div>
            <div class="pyq-quiz-dist-item">
              <div class="pyq-quiz-dist-name">🗺️ Geography</div>
              <div class="pyq-quiz-dist-val">3 Qs</div>
            </div>
            <div class="pyq-quiz-dist-item">
              <div class="pyq-quiz-dist-name">🌿 Environment</div>
              <div class="pyq-quiz-dist-val">3 Qs</div>
            </div>
            <div class="pyq-quiz-dist-item">
              <div class="pyq-quiz-dist-name">🔬 Sci-Tech</div>
              <div class="pyq-quiz-dist-val">2 Qs</div>
            </div>
          </div>

          <div class="pyq-quiz-rules-box">
            <div class="pyq-quiz-rule-pill">
              <span>🎯</span>
              <span>20 Questions (Total 40 Marks)</span>
            </div>
            <div class="pyq-quiz-rule-pill">
              <span>⏱️</span>
              <span>25 Minutes Recommended</span>
            </div>
            <div class="pyq-quiz-rule-pill">
              <span>⚖️</span>
              <span>+2.00 Correct &bull; -0.66 Incorrect</span>
            </div>
            <div class="pyq-quiz-rule-pill">
              <span>📊</span>
              <span>Stored in Database &amp; Graphed</span>
            </div>
          </div>

          <button type="button" class="pyq-quiz-primary-btn" id="pyqStartQuizBtn">
            <span>🚀 Start Today's 20-Question Quiz</span>
          </button>
        </div>
      `;

      const startBtn = $('#pyqStartQuizBtn');
      if (startBtn) {
        startBtn.addEventListener('click', async () => {
          startBtn.disabled = true;
          startBtn.innerHTML = '<span>⏳ Preparing 20 Mixed Questions...</span>';
          await launchDailyQuiz(dateStr);
        });
      }
    }

    async function launchDailyQuiz(dateStr) {
      const questions = await generateDailyQuizQuestions(dateStr);
      if (!questions || questions.length === 0) {
        showPyqToast('⚠️ Could not assemble questions. Please retry.');
        renderQuizTabContent();
        return;
      }

      state.activeQuiz = {
        dateStr: dateStr,
        questions: questions,
        currentIndex: 0,
        answers: {},
        flags: new Set(),
        timeElapsed: 0,
        status: 'in_progress',
        startedAt: Date.now()
      };

      saveActiveQuizSession();
      startQuizTimer();
      renderQuizTabContent();
    }

    function startQuizTimer() {
      clearInterval(state._quizTimerInterval);
      state._quizTimerInterval = setInterval(() => {
        if (!state.activeQuiz || state.activeQuiz.status !== 'in_progress') {
          clearInterval(state._quizTimerInterval);
          return;
        }
        state.activeQuiz.timeElapsed++;
        updateQuizTimerDisplay();
        if (state.activeQuiz.timeElapsed % 5 === 0) {
          saveActiveQuizSession();
        }
      }, 1000);
    }

    function saveActiveQuizSession() {
      if (!state.activeQuiz) {
        try { localStorage.removeItem('pyq_active_quiz_session'); } catch (e) {}
        return;
      }
      try {
        const payload = {
          ...state.activeQuiz,
          flags: Array.from(state.activeQuiz.flags || [])
        };
        localStorage.setItem('pyq_active_quiz_session', JSON.stringify(payload));
      } catch (e) {}
    }

    function updateQuizTimerDisplay() {
      const timerEl = $('#pyqQuizTimerVal');
      if (timerEl && state.activeQuiz) {
        timerEl.textContent = formatQuizTime(state.activeQuiz.timeElapsed);
        if (state.activeQuiz.timeElapsed >= 1500) { // 25 min
          timerEl.parentElement.classList.add('pyq-quiz-timer-urgent');
        }
      }
    }

    // --- Sub-View: Active Exam ---
    function renderActiveQuizExam(container) {
      const q = state.activeQuiz.questions[state.activeQuiz.currentIndex];
      const curIdx = state.activeQuiz.currentIndex;
      const total = state.activeQuiz.questions.length;
      const selectedOption = state.activeQuiz.answers[q.id];
      const isFlagged = state.activeQuiz.flags.has(q.id);

      const answeredCount = Object.keys(state.activeQuiz.answers).length;
      const pct = Math.round(((curIdx + 1) / total) * 100);

      container.innerHTML = `
        <div class="pyq-quiz-active-layout">
          <div class="pyq-quiz-main-area">
            <!-- Top bar -->
            <div class="pyq-quiz-top-bar">
              <div class="pyq-quiz-progress-text">
                Question ${curIdx + 1} of ${total}
                <span style="font-size:11.5px; font-weight:700; color:var(--pyq-text-muted); margin-left:6px;">(${answeredCount}/${total} Answered)</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="pyq-quiz-timer-wrap ${state.activeQuiz.timeElapsed >= 1500 ? 'pyq-quiz-timer-urgent' : ''}">
                  <span>⏱️</span>
                  <span id="pyqQuizTimerVal">${formatQuizTime(state.activeQuiz.timeElapsed)}</span>
                </div>
                <button type="button" class="pyq-quiz-flag-btn ${isFlagged ? 'pyq-flagged' : ''}" id="pyqQuizFlagBtn" title="Flag this question for review">
                  <span>${isFlagged ? '🚩 Flagged' : '🏳️ Review'}</span>
                </button>
              </div>
            </div>

            <div class="pyq-quiz-progress-line">
              <div class="pyq-quiz-progress-fill" style="width: ${pct}%;"></div>
            </div>

            <!-- Question Card -->
            <div class="pyq-quiz-qcard">
              <div class="pyq-quiz-qmeta">
                <div class="pyq-quiz-qtags">
                  <span class="pyq-quiz-tag-num">Q.${curIdx + 1}</span>
                  <span class="pyq-quiz-tag-subject">${q.subject || 'GS-1'}</span>
                  <span class="pyq-quiz-tag-year">${q.year} PYQ</span>
                  ${q.topic ? `<span class="pyq-quiz-tag-subject" style="background:var(--pyq-primary-soft); color:var(--pyq-primary);">${q.topic}</span>` : ''}
                </div>
                <div style="font-size:11px; font-weight:800; color:var(--pyq-text-muted);">
                  Marking: <span style="color:var(--pyq-emerald);">+2.00</span> / <span style="color:var(--pyq-crimson);">-0.66</span>
                </div>
              </div>

              <div class="pyq-quiz-qtext">${q.question}</div>

              ${Array.isArray(q.statements) && q.statements.length > 0 ? `
                <div class="pyq-quiz-statements-box">
                  ${q.statements.map((st, sIdx) => `
                    <div class="pyq-quiz-statement-item">
                      <strong>${sIdx + 1}.</strong> ${st}
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <!-- 4 Options -->
              <div class="pyq-quiz-options-list">
                ${['a', 'b', 'c', 'd'].map(optKey => {
                  const optText = q.options ? q.options[optKey] : '';
                  if (!optText) return '';
                  const isSel = selectedOption === optKey;
                  return `
                    <button type="button" class="pyq-quiz-opt-btn ${isSel ? 'pyq-selected' : ''}" data-opt="${optKey}">
                      <span class="pyq-quiz-opt-letter">${optKey.toUpperCase()}</span>
                      <span class="pyq-quiz-opt-text">${optText}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Bottom Navigation -->
            <div class="pyq-quiz-bottom-bar">
              <button type="button" class="pyq-quiz-btn" id="pyqQuizPrevBtn" ${curIdx === 0 ? 'disabled' : ''}>
                <span>← Previous</span>
              </button>

              <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" class="pyq-quiz-btn" id="pyqQuizClearBtn" ${!selectedOption ? 'disabled' : ''} style="font-size:12px;">
                  <span>✕ Clear</span>
                </button>
                ${curIdx < total - 1 ? `
                  <button type="button" class="pyq-quiz-btn" id="pyqQuizNextBtn" style="background:var(--pyq-primary); color:#FFF; border-color:var(--pyq-primary);">
                    <span>Next →</span>
                  </button>
                ` : `
                  <button type="button" class="pyq-quiz-btn pyq-quiz-btn-submit" id="pyqQuizFinishBtn">
                    <span>Submit Quiz 🏁</span>
                  </button>
                `}
              </div>
            </div>
          </div>

          <!-- Question Palette Sidebar -->
          <div class="pyq-quiz-palette-card">
            <div class="pyq-quiz-palette-header">
              <span>Question Palette</span>
              <span style="font-size:11px; font-weight:700; color:var(--pyq-text-muted);">20 Questions</span>
            </div>

            <div class="pyq-quiz-palette-grid">
              ${state.activeQuiz.questions.map((quest, pIdx) => {
                const isCur = pIdx === curIdx;
                const isAns = !!state.activeQuiz.answers[quest.id];
                const isFlg = state.activeQuiz.flags.has(quest.id);
                let cls = 'pyq-quiz-pal-btn';
                if (isCur) cls += ' pyq-current';
                if (isAns) cls += ' pyq-answered';
                if (isFlg) cls += ' pyq-flagged';
                return `
                  <button type="button" class="${cls}" data-jump="${pIdx}">
                    ${pIdx + 1}
                  </button>
                `;
              }).join('')}
            </div>

            <div class="pyq-quiz-pal-legend">
              <div class="pyq-quiz-pal-legend-item">
                <span class="pyq-quiz-pal-dot" style="background:var(--pyq-emerald);"></span>
                <span>Answered (${answeredCount})</span>
              </div>
              <div class="pyq-quiz-pal-legend-item">
                <span class="pyq-quiz-pal-dot" style="background:var(--pyq-amber);"></span>
                <span>Marked for Review (${state.activeQuiz.flags.size})</span>
              </div>
              <div class="pyq-quiz-pal-legend-item">
                <span class="pyq-quiz-pal-dot" style="background:var(--pyq-bg-subtle); border:1px solid var(--pyq-border);"></span>
                <span>Unanswered (${total - answeredCount})</span>
              </div>
            </div>

            <button type="button" class="pyq-quiz-primary-btn" id="pyqQuizSubmitSidebarBtn" style="width:100%; margin-top:16px; padding:10px; font-size:13.5px; background:var(--pyq-emerald);">
              <span>Submit Daily Quiz</span>
            </button>
          </div>
        </div>
      `;

      // Event bindings
      container.querySelectorAll('.pyq-quiz-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const opt = btn.getAttribute('data-opt');
          if (state.activeQuiz.answers[q.id] === opt) {
            delete state.activeQuiz.answers[q.id];
          } else {
            state.activeQuiz.answers[q.id] = opt;
          }
          saveActiveQuizSession();
          renderActiveQuizExam(container);
        });
      });

      const prevBtn = $('#pyqQuizPrevBtn');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (state.activeQuiz.currentIndex > 0) {
            state.activeQuiz.currentIndex--;
            saveActiveQuizSession();
            renderActiveQuizExam(container);
          }
        });
      }

      const nextBtn = $('#pyqQuizNextBtn');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (state.activeQuiz.currentIndex < total - 1) {
            state.activeQuiz.currentIndex++;
            saveActiveQuizSession();
            renderActiveQuizExam(container);
          }
        });
      }

      const clearBtn = $('#pyqQuizClearBtn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          delete state.activeQuiz.answers[q.id];
          saveActiveQuizSession();
          renderActiveQuizExam(container);
        });
      }

      const flagBtn = $('#pyqQuizFlagBtn');
      if (flagBtn) {
        flagBtn.addEventListener('click', () => {
          if (state.activeQuiz.flags.has(q.id)) {
            state.activeQuiz.flags.delete(q.id);
          } else {
            state.activeQuiz.flags.add(q.id);
          }
          saveActiveQuizSession();
          renderActiveQuizExam(container);
        });
      }

      container.querySelectorAll('[data-jump]').forEach(btn => {
        btn.addEventListener('click', () => {
          const jIdx = parseInt(btn.getAttribute('data-jump'), 10);
          if (!isNaN(jIdx) && jIdx >= 0 && jIdx < total) {
            state.activeQuiz.currentIndex = jIdx;
            saveActiveQuizSession();
            renderActiveQuizExam(container);
          }
        });
      });

      const finishBtn = $('#pyqQuizFinishBtn');
      const sideSubmitBtn = $('#pyqQuizSubmitSidebarBtn');
      const submitAction = () => {
        const unans = total - answeredCount;
        const msg = unans > 0 
          ? `You have ${unans} unanswered question${unans > 1 ? 's' : ''}. Are you sure you want to submit?`
          : 'Are you sure you want to submit your Daily Quiz?';
        if (confirm(msg)) {
          finishDailyQuiz();
        }
      };

      if (finishBtn) finishBtn.addEventListener('click', submitAction);
      if (sideSubmitBtn) sideSubmitBtn.addEventListener('click', submitAction);
    }

    function finishDailyQuiz() {
      clearInterval(state._quizTimerInterval);
      if (!state.activeQuiz) return;

      const aq = state.activeQuiz;
      const questions = aq.questions;
      let correctCount = 0;
      let wrongCount = 0;
      let unattemptedCount = 0;

      const subjectBreakdown = {};

      questions.forEach(q => {
        const subKey = (q.subject || 'General Studies').toLowerCase();
        if (!subjectBreakdown[subKey]) {
          subjectBreakdown[subKey] = { correct: 0, total: 0 };
        }
        subjectBreakdown[subKey].total++;

        const userAns = aq.answers[q.id];
        const correctAns = (q.answer || '').toLowerCase().trim();

        if (!userAns) {
          unattemptedCount++;
        } else if (userAns.toLowerCase() === correctAns) {
          correctCount++;
          subjectBreakdown[subKey].correct++;
          // Record attempted in main tracker
          state.attempted.add(q.id);
          state.attemptedMeta[q.id] = { active: true, updatedAt: Date.now() };
          state.userAnswers[q.id] = { selected: userAns, isCorrect: true, updatedAt: Date.now() };
        } else {
          wrongCount++;
          // Record attempted in main tracker
          state.attempted.add(q.id);
          state.attemptedMeta[q.id] = { active: true, updatedAt: Date.now() };
          state.userAnswers[q.id] = { selected: userAns, isCorrect: false, updatedAt: Date.now() };
        }
      });

      // UPSC Prelims GS Paper 1 standard scoring: +2.0 for correct, -0.66 for wrong
      const score = Math.max(0, (correctCount * 2.0) - (wrongCount * 0.66));
      const accuracy = (correctCount + wrongCount) > 0 
        ? Math.round((correctCount / (correctCount + wrongCount)) * 1000) / 10 
        : 0;

      const record = {
        id: 'quiz_' + aq.dateStr,
        date: aq.dateStr,
        dateFormatted: new Date(aq.dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        totalQuestions: 20,
        score: Math.round(score * 100) / 100,
        maxScore: 40,
        correctCount,
        wrongCount,
        unattemptedCount,
        accuracy,
        timeSpentSeconds: aq.timeElapsed,
        completedAt: Date.now(),
        subjectBreakdown,
        userAnswers: aq.answers,
        questions: questions.map(q => ({
          id: q.id,
          subject: q.subject,
          year: q.year,
          question: q.question,
          statements: q.statements,
          options: q.options,
          answer: q.answer,
          topic: q.topic,
          concept: q.concept,
          explanation: q.explanation,
          trap: q.trap
        }))
      };

      // Upsert into quizHistory (latest first)
      state.quizHistory = state.quizHistory.filter(q => q.date !== aq.dateStr);
      state.quizHistory.unshift(record);
      saveMeta('pyq_daily_quiz_history_v1', state.quizHistory);

      // Save attempted to localStorage & sync
      saveSet('pyq_attempted', state.attempted);
      saveMeta('pyq_attempted_meta', state.attemptedMeta);
      saveMeta('pyq_answers', state.userAnswers);

      state.activeQuiz = null;
      try { localStorage.removeItem('pyq_active_quiz_session'); } catch (e) {}

      renderHeroStats();
      syncPushPyqData();
      showPyqToast(`🏁 Quiz Completed! Score: ${record.score}/40 (${record.accuracy}% Accuracy)`);

      renderQuizContainerMarkup($('#pyqQuizView'));
    }

    // --- Sub-View: Completed Today Card with Review ---
    function renderCompletedTodayCard(container, record) {
      container.innerHTML = `
        <div class="pyq-quiz-result-hero">
          <div class="pyq-quiz-score-circle">
            <span class="pyq-quiz-score-val">${record.score}</span>
            <span class="pyq-quiz-score-denom">/ 40 Marks</span>
          </div>

          <h3 class="pyq-quiz-result-title">Today's Daily Challenge Completed!</h3>
          <p style="font-size:13.5px; color:var(--pyq-text-muted); margin:0 auto 18px auto; max-width:560px;">
            Your performance on ${record.dateFormatted} has been recorded in the database and added to your progress curves.
          </p>

          <div class="pyq-quiz-stats-row">
            <div class="pyq-quiz-stat-pill">
              <div class="pyq-quiz-stat-pill-val" style="color:var(--pyq-primary);">${record.accuracy}%</div>
              <div class="pyq-quiz-stat-pill-lbl">Accuracy</div>
            </div>
            <div class="pyq-quiz-stat-pill">
              <div class="pyq-quiz-stat-pill-val" style="color:var(--pyq-emerald);">${record.correctCount}</div>
              <div class="pyq-quiz-stat-pill-lbl">Correct (+2.0)</div>
            </div>
            <div class="pyq-quiz-stat-pill">
              <div class="pyq-quiz-stat-pill-val" style="color:var(--pyq-crimson);">${record.wrongCount}</div>
              <div class="pyq-quiz-stat-pill-lbl">Incorrect (-0.66)</div>
            </div>
            <div class="pyq-quiz-stat-pill">
              <div class="pyq-quiz-stat-pill-val" style="color:var(--pyq-text-muted);">${record.unattemptedCount}</div>
              <div class="pyq-quiz-stat-pill-lbl">Skipped</div>
            </div>
            <div class="pyq-quiz-stat-pill">
              <div class="pyq-quiz-stat-pill-val">${formatQuizTime(record.timeSpentSeconds || 0)}</div>
              <div class="pyq-quiz-stat-pill-lbl">Time Taken</div>
            </div>
          </div>

          <!-- Subject Breakdown Chips -->
          <div class="pyq-quiz-breakdown-chips">
            ${Object.keys(record.subjectBreakdown || {}).map(sub => {
              const b = record.subjectBreakdown[sub];
              const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
              return `
                <span class="pyq-quiz-chip">
                  <strong>${sub.toUpperCase()}:</strong> ${b.correct}/${b.total} (${pct}%)
                </span>
              `;
            }).join('')}
          </div>

          <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-top:24px; flex-wrap:wrap;">
            <button type="button" class="pyq-quiz-primary-btn" id="pyqQuizViewGraphsBtn">
              <span>📊 View Performance Graphs</span>
            </button>
            <button type="button" class="pyq-quiz-btn" id="pyqQuizRetakeBtn" style="padding:12px 20px; font-weight:700;">
              <span>🔄 Retake for Practice</span>
            </button>
          </div>
        </div>

        <!-- Full Detailed Solutions Breakdown -->
        <div class="pyq-quiz-review-section">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
            <h4 style="font-family:var(--pyq-font-heading); font-size:18px; font-weight:800; color:var(--pyq-text-primary); margin:0;">
              Detailed Question Analysis &amp; Traps (20 Questions)
            </h4>
          </div>

          ${renderQuestionReviewListMarkup(record)}
        </div>
      `;

      const viewGraphsBtn = $('#pyqQuizViewGraphsBtn');
      if (viewGraphsBtn) {
        viewGraphsBtn.addEventListener('click', () => {
          state.quizTab = 'results';
          renderQuizContainerMarkup($('#pyqQuizView'));
        });
      }

      const retakeBtn = $('#pyqQuizRetakeBtn');
      if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
          if (confirm('Retake today\'s quiz? (Your best previous score will remain saved in history)')) {
            launchDailyQuiz(record.date);
          }
        });
      }

      bindReviewCardActions(container);
    }

    function renderQuestionReviewListMarkup(record) {
      if (!record.questions || record.questions.length === 0) {
        return '<p style="color:var(--pyq-text-muted);">Question breakdown not available for this record.</p>';
      }

      return record.questions.map((q, idx) => {
        const userChoice = record.userAnswers ? record.userAnswers[q.id] : null;
        const correctChoice = (q.answer || '').toLowerCase().trim();
        const isCorrect = userChoice && userChoice.toLowerCase() === correctChoice;
        const isSkipped = !userChoice;

        let statusCls = isCorrect ? 'pyq-status-correct' : (isSkipped ? 'pyq-status-skipped' : 'pyq-status-wrong');

        return `
          <div class="pyq-quiz-review-item ${statusCls}">
            <div class="pyq-quiz-verdict-bar ${isCorrect ? 'pyq-quiz-verdict-correct' : (isSkipped ? 'pyq-quiz-verdict-skipped' : 'pyq-quiz-verdict-wrong')}">
              <div>
                ${isCorrect 
                  ? '✓ Correct (+2.00 Marks)' 
                  : (isSkipped 
                      ? `○ Unattempted (Correct Answer: ${correctChoice.toUpperCase()})` 
                      : `✗ Incorrect (-0.66 Marks) &bull; You chose (${userChoice.toUpperCase()}), Correct is (${correctChoice.toUpperCase()})`)}
              </div>
              <div style="font-size:11px; opacity:0.85;">Q.${idx + 1} &bull; ${q.subject || 'GS'} &bull; ${q.year}</div>
            </div>

            <div class="pyq-quiz-qtext" style="font-size:14.5px;">${q.question}</div>

            ${Array.isArray(q.statements) && q.statements.length > 0 ? `
              <div class="pyq-quiz-statements-box" style="margin-bottom:14px;">
                ${q.statements.map((st, sIdx) => `
                  <div class="pyq-quiz-statement-item"><strong>${sIdx + 1}.</strong> ${st}</div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Options with color indicators -->
            <div class="pyq-quiz-options-list" style="margin-bottom:14px;">
              ${['a', 'b', 'c', 'd'].map(optKey => {
                const optText = q.options ? q.options[optKey] : '';
                if (!optText) return '';
                const isThisCorrect = optKey === correctChoice;
                const isThisUser = userChoice && userChoice.toLowerCase() === optKey;

                let borderStyle = 'border:1px solid var(--pyq-border);';
                let bgStyle = 'background:var(--pyq-bg-card);';
                let tag = '';

                if (isThisCorrect) {
                  borderStyle = 'border:1.5px solid var(--pyq-emerald);';
                  bgStyle = 'background:var(--pyq-emerald-soft);';
                  tag = '<span style="font-size:11px; font-weight:800; color:var(--pyq-emerald); margin-left:auto;">✓ CORRECT</span>';
                } else if (isThisUser && !isCorrect) {
                  borderStyle = 'border:1.5px solid var(--pyq-crimson);';
                  bgStyle = 'background:var(--pyq-crimson-soft);';
                  tag = '<span style="font-size:11px; font-weight:800; color:var(--pyq-crimson); margin-left:auto;">✗ YOUR CHOICE</span>';
                }

                return `
                  <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:var(--pyq-radius-sm); ${borderStyle} ${bgStyle}">
                    <span class="pyq-quiz-opt-letter" style="${isThisCorrect ? 'background:var(--pyq-emerald); color:#FFF;' : (isThisUser ? 'background:var(--pyq-crimson); color:#FFF;' : '')}">${optKey.toUpperCase()}</span>
                    <span style="font-size:13.5px; color:var(--pyq-text-primary);">${optText}</span>
                    ${tag}
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Detailed Explanation & Examiner Trap -->
            ${q.explanation || q.concept || q.trap ? `
              <div style="background:var(--pyq-bg-subtle); border-radius:var(--pyq-radius-md); padding:14px 16px; font-size:13px; line-height:1.55; color:var(--pyq-text-secondary);">
                ${q.concept ? `
                  <div style="margin-bottom:8px;">
                    <strong style="color:var(--pyq-primary); font-size:11.5px; text-transform:uppercase;">Core Concept:</strong>
                    <div>${q.concept}</div>
                  </div>
                ` : ''}
                ${q.explanation ? `
                  <div style="margin-bottom:8px;">
                    <strong style="color:var(--pyq-text-primary); font-size:11.5px; text-transform:uppercase;">Official UPSC Explanation:</strong>
                    <div>${q.explanation}</div>
                  </div>
                ` : ''}
                ${q.trap ? `
                  <div style="background:var(--pyq-amber-soft); border-left:3px solid var(--pyq-amber); padding:8px 12px; border-radius:4px; color:var(--pyq-text-primary); font-size:12.5px;">
                    <strong>⚠️ Examiner Trap:</strong> ${q.trap}
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <div style="margin-top:12px; display:flex; justify-content:flex-end;">
              <button type="button" class="pyq-btn-add-example" data-q-save-eb="${q.id}">
                <span>💡 Save to Examples Bank</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    function bindReviewCardActions(container) {
      container.querySelectorAll('[data-q-save-eb]').forEach(btn => {
        btn.addEventListener('click', () => {
          const qId = btn.getAttribute('data-q-save-eb');
          if (qId) saveQuestionToExamples(qId);
        });
      });
    }

    // --- Sub-View: Performance Graphs & Summary ---
    function renderQuizAnalyticsAndGraphs(container) {
      const history = state.quizHistory || [];
      const totalQuizzes = history.length;

      let totalScoreSum = 0;
      let totalAccSum = 0;
      let bestScore = 0;

      const subjectAgg = {
        polity: { correct: 0, total: 0, name: '⚖️ Indian Polity & Governance' },
        economy: { correct: 0, total: 0, name: '📈 Economy & Development' },
        history: { correct: 0, total: 0, name: '🏛️ History & National Movement' },
        geography: { correct: 0, total: 0, name: '🗺️ Indian & World Geography' },
        environment: { correct: 0, total: 0, name: '🌿 Environment & Ecology' },
        'science-tech': { correct: 0, total: 0, name: '🔬 Science & Emerging Tech' }
      };

      history.forEach(h => {
        totalScoreSum += (h.score || 0);
        totalAccSum += (h.accuracy || 0);
        if (h.score > bestScore) bestScore = h.score;

        if (h.subjectBreakdown) {
          Object.keys(h.subjectBreakdown).forEach(k => {
            const key = k.toLowerCase();
            if (subjectAgg[key]) {
              subjectAgg[key].correct += (h.subjectBreakdown[k].correct || 0);
              subjectAgg[key].total += (h.subjectBreakdown[k].total || 0);
            }
          });
        }
      });

      const avgScore = totalQuizzes > 0 ? (Math.round((totalScoreSum / totalQuizzes) * 10) / 10) : 0;
      const avgAccuracy = totalQuizzes > 0 ? (Math.round((totalAccSum / totalQuizzes) * 10) / 10) : 0;
      const streak = calculateDailyStreak(history);

      container.innerHTML = `
        <!-- KPI Row -->
        <div class="pyq-quiz-analytics-grid">
          <div class="pyq-quiz-kpi">
            <div class="pyq-quiz-kpi-top">
              <span class="pyq-quiz-kpi-title">Quizzes Completed</span>
              <span class="pyq-quiz-kpi-icon">⚡</span>
            </div>
            <div class="pyq-quiz-kpi-val">${totalQuizzes}</div>
            <div class="pyq-quiz-kpi-sub">${totalQuizzes * 20} Questions Attempted</div>
          </div>

          <div class="pyq-quiz-kpi">
            <div class="pyq-quiz-kpi-top">
              <span class="pyq-quiz-kpi-title">Average Score</span>
              <span class="pyq-quiz-kpi-icon">🎯</span>
            </div>
            <div class="pyq-quiz-kpi-val">${avgScore} <span style="font-size:14px; font-weight:700; color:var(--pyq-text-muted);">/ 40</span></div>
            <div class="pyq-quiz-kpi-sub">Best: ${bestScore}/40 Marks</div>
          </div>

          <div class="pyq-quiz-kpi">
            <div class="pyq-quiz-kpi-top">
              <span class="pyq-quiz-kpi-title">Overall Accuracy</span>
              <span class="pyq-quiz-kpi-icon">📈</span>
            </div>
            <div class="pyq-quiz-kpi-val" style="color:var(--pyq-emerald);">${avgAccuracy}%</div>
            <div class="pyq-quiz-kpi-sub">Cutoff target: &ge; 50%</div>
          </div>

          <div class="pyq-quiz-kpi">
            <div class="pyq-quiz-kpi-top">
              <span class="pyq-quiz-kpi-title">Daily Streak</span>
              <span class="pyq-quiz-kpi-icon">🔥</span>
            </div>
            <div class="pyq-quiz-kpi-val" style="color:var(--pyq-amber);">${streak} <span style="font-size:14px; font-weight:700;">Days</span></div>
            <div class="pyq-quiz-kpi-sub">Consistency index</div>
          </div>
        </div>

        <!-- Graph 1: Daily Score Trend Curve -->
        <div class="pyq-quiz-chart-card">
          <div class="pyq-quiz-chart-title-wrap">
            <h4 class="pyq-quiz-chart-title">
              <span>📈</span>
              <span>Daily Score Progression &amp; Cutoff Benchmark</span>
            </h4>
            <div style="font-size:11.5px; color:var(--pyq-text-muted);">
              UPSC Standard Marking (+2.00 / -0.66) &bull; Last 14 Quizzes
            </div>
          </div>

          <div class="pyq-quiz-chart-svg-wrap">
            ${generateScoreTrendSvg(history)}
          </div>
        </div>

        <!-- Graph 2: Subject Accuracy Horizontal Bars -->
        <div class="pyq-quiz-chart-card">
          <div class="pyq-quiz-chart-title-wrap">
            <h4 class="pyq-quiz-chart-title">
              <span>🎯</span>
              <span>Subject-Wise Mastery Comparison</span>
            </h4>
            <div style="font-size:11.5px; color:var(--pyq-text-muted);">
              Empirical accuracy aggregated across all daily mocks
            </div>
          </div>

          <div class="pyq-quiz-sub-bars">
            ${Object.keys(subjectAgg).map(k => {
              const item = subjectAgg[k];
              const pct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
              let barColor = 'var(--pyq-emerald)';
              if (pct < 45) barColor = 'var(--pyq-crimson)';
              else if (pct < 65) barColor = 'var(--pyq-amber)';
              else if (pct < 80) barColor = 'var(--pyq-primary)';

              return `
                <div class="pyq-quiz-sub-bar-row">
                  <div class="pyq-quiz-sub-bar-labels">
                    <span style="color:var(--pyq-text-primary);">${item.name}</span>
                    <span style="color:var(--pyq-text-secondary); font-family:var(--pyq-font-mono);">
                      ${item.correct}/${item.total} (${pct}%)
                    </span>
                  </div>
                  <div class="pyq-quiz-sub-bar-track">
                    <div class="pyq-quiz-sub-bar-fill" style="width:${pct}%; background:${barColor};"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    function generateScoreTrendSvg(history) {
      if (!history || history.length === 0) {
        return `
          <div style="padding:48px 24px; text-align:center; color:var(--pyq-text-muted);">
            <div style="font-size:36px; margin-bottom:8px;">📈</div>
            <div style="font-weight:700; font-size:15px; color:var(--pyq-text-primary);">No Quiz History Yet</div>
            <div style="font-size:13px; margin-top:4px;">Take your first 20-question Daily Quiz to start building your score progression graph!</div>
          </div>
        `;
      }

      const sorted = [...history].sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
      const recent = sorted.slice(-14);

      const w = 620;
      const h = 220;
      const padL = 40;
      const padR = 25;
      const padT = 25;
      const padB = 40;

      const chartW = w - padL - padR;
      const chartH = h - padT - padB;

      const maxScore = 40;
      const minScore = 0;

      const getX = (idx) => {
        if (recent.length === 1) return padL + (chartW / 2);
        return padL + (idx / (recent.length - 1)) * chartW;
      };

      const getY = (val) => {
        const clamped = Math.max(minScore, Math.min(maxScore, val));
        return padT + chartH - ((clamped - minScore) / (maxScore - minScore)) * chartH;
      };

      const points = recent.map((item, idx) => ({
        x: getX(idx),
        y: getY(item.score),
        score: item.score,
        acc: item.accuracy,
        date: item.dateFormatted || item.date
      }));

      const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
      const areaD = `${pathD} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;
      const cutoffY = getY(20);

      return `
        <svg class="pyq-quiz-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="pyqScoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2563EB" stop-opacity="0.32"/>
              <stop offset="100%" stop-color="#2563EB" stop-opacity="0.02"/>
            </linearGradient>
          </defs>

          <!-- Y Grid lines -->
          <line x1="${padL}" y1="${getY(0)}" x2="${w - padR}" y2="${getY(0)}" stroke="var(--pyq-border)" stroke-width="1" />
          <text x="${padL - 8}" y="${getY(0) + 4}" font-size="10" fill="var(--pyq-text-muted)" text-anchor="end">0</text>

          <line x1="${padL}" y1="${getY(10)}" x2="${w - padR}" y2="${getY(10)}" stroke="var(--pyq-border-subtle)" stroke-width="1" stroke-dasharray="3,3" />
          <text x="${padL - 8}" y="${getY(10) + 4}" font-size="10" fill="var(--pyq-text-muted)" text-anchor="end">10</text>

          <line x1="${padL}" y1="${getY(20)}" x2="${w - padR}" y2="${getY(20)}" stroke="var(--pyq-border-subtle)" stroke-width="1" stroke-dasharray="3,3" />
          <text x="${padL - 8}" y="${getY(20) + 4}" font-size="10" fill="var(--pyq-text-muted)" text-anchor="end">20</text>

          <line x1="${padL}" y1="${getY(30)}" x2="${w - padR}" y2="${getY(30)}" stroke="var(--pyq-border-subtle)" stroke-width="1" stroke-dasharray="3,3" />
          <text x="${padL - 8}" y="${getY(30) + 4}" font-size="10" fill="var(--pyq-text-muted)" text-anchor="end">30</text>

          <line x1="${padL}" y1="${getY(40)}" x2="${w - padR}" y2="${getY(40)}" stroke="var(--pyq-border)" stroke-width="1" />
          <text x="${padL - 8}" y="${getY(40) + 4}" font-size="10" fill="var(--pyq-text-muted)" text-anchor="end">40</text>

          <!-- Cutoff Benchmark line (20 marks = 50%) -->
          <line x1="${padL}" y1="${cutoffY}" x2="${w - padR}" y2="${cutoffY}" stroke="#D97706" stroke-width="1.2" stroke-dasharray="4,4" />
          <text x="${w - padR}" y="${cutoffY - 5}" font-size="9.5" font-weight="700" fill="#D97706" text-anchor="end">Cutoff Benchmark (50% / 20M)</text>

          <!-- Area & Line -->
          <path d="${areaD}" fill="url(#pyqScoreGrad)" />
          <path d="${pathD}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Points -->
          ${points.map(p => `
            <g class="pyq-chart-pt">
              <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#FFFFFF" stroke="#2563EB" stroke-width="2.5" />
              <text x="${p.x}" y="${p.y - 8}" font-size="10" font-weight="800" fill="#1D4ED8" text-anchor="middle">${p.score}</text>
              <text x="${p.x}" y="${padT + chartH + 18}" font-size="9" fill="var(--pyq-text-muted)" text-anchor="middle">${p.date.split(',')[0].slice(0, 6)}</text>
            </g>
          `).join('')}
        </svg>
      `;
    }

    // --- Sub-View: History Archive ---
    function renderQuizHistoryArchive(container) {
      const history = state.quizHistory || [];
      if (history.length === 0) {
        container.innerHTML = `
          <div class="pyq-quiz-start-card">
            <div style="font-size:36px; margin-bottom:10px;">📜</div>
            <h3 class="pyq-quiz-start-title">No Quizzes in Archive</h3>
            <p style="color:var(--pyq-text-muted); font-size:14px; margin-bottom:20px;">
              Completed daily quizzes will be logged here with detailed question reviews, scores, and breakdown summaries.
            </p>
            <button type="button" class="pyq-quiz-primary-btn" id="pyqHistTakeFirstBtn">
              <span>⚡ Take Today's Quiz Now</span>
            </button>
          </div>
        `;
        const takeBtn = $('#pyqHistTakeFirstBtn');
        if (takeBtn) {
          takeBtn.addEventListener('click', () => {
            state.quizTab = 'take';
            renderQuizContainerMarkup($('#pyqQuizView'));
          });
        }
        return;
      }

      container.innerHTML = `
        <div style="margin-bottom:18px; display:flex; align-items:center; justify-content:space-between;">
          <h3 style="font-family:var(--pyq-font-heading); font-size:18px; font-weight:800; color:var(--pyq-text-primary); margin:0;">
            Completed Daily Quizzes Archive (${history.length})
          </h3>
        </div>

        <div class="pyq-quiz-history-list">
          ${history.map(item => `
            <div class="pyq-quiz-history-card">
              <div class="pyq-quiz-hist-left">
                <div class="pyq-quiz-hist-icon">⚡</div>
                <div>
                  <div class="pyq-quiz-hist-date">${item.dateFormatted || item.date}</div>
                  <div class="pyq-quiz-hist-meta">
                    ${item.correctCount || 0} Correct &bull; ${item.wrongCount || 0} Incorrect &bull; ${item.unattemptedCount || 0} Skipped &bull; ⏱️ ${formatQuizTime(item.timeSpentSeconds || 0)}
                  </div>
                </div>
              </div>

              <div class="pyq-quiz-hist-right">
                <div class="pyq-quiz-hist-score">
                  <div class="pyq-quiz-hist-score-val">${item.score}/40</div>
                  <div class="pyq-quiz-hist-acc">${item.accuracy}% Accuracy</div>
                </div>
                <button type="button" class="pyq-quiz-btn" data-review-quiz-id="${item.id}" style="padding:8px 14px; font-size:12.5px;">
                  <span>Review →</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      container.querySelectorAll('[data-review-quiz-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const qId = btn.getAttribute('data-review-quiz-id');
          const found = history.find(h => h.id === qId);
          if (found) {
            renderCompletedTodayCard(container, found);
          }
        });
      });
    }


    // 13. Filter Event Listeners
    function attachFilterListeners() {
      const searchInput = $('#pyqSearchInput');
      const searchClear = $('#pyqSearchClear');
      const yearSelect = $('#pyqFilterYear');
      const topicSelect = $('#pyqFilterTopic');
      const subTopicSelect = $('#pyqFilterSubTopic');
      const typeSelect = $('#pyqFilterType');
      const toggleShowAns = $('#pyqToggleShowAnswers');
      const toggleBookmarked = $('#pyqToggleBookmarked');
      const toggleAttempted = $('#pyqToggleAttempted');

      const viewQuestionsBtn = $('#pyqViewQuestions');
      const viewAnalyticsBtn = $('#pyqViewAnalytics');
      const viewPdfsBtn = $('#pyqViewPdfs');
      const themeToggleBtn = $('#pyqThemeToggle');

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          state.filters.searchQuery = e.target.value;
          if (searchClear) searchClear.style.display = e.target.value.length > 0 ? 'flex' : 'none';
          state.pagination.page = 1;
          applyFiltersAndRender();
        });

        if (searchClear) {
          searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.style.display = 'none';
            state.filters.searchQuery = '';
            state.pagination.page = 1;
            applyFiltersAndRender();
            searchInput.focus();
          });
        }

        // Global hotkey: Press '/' or 'Ctrl+K' to focus search
        document.addEventListener('keydown', (e) => {
          if ((e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) && document.activeElement !== searchInput) {
            if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
              e.preventDefault();
              searchInput.focus();
              searchInput.select();
            }
          }
        });
      }

      // Quick Smart Filter Chips
      const quickChips = root.querySelectorAll('#pyqQuickChips .pyq-chip-btn');
      quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
          quickChips.forEach(c => c.classList.remove('pyq-chip-active'));
          chip.classList.add('pyq-chip-active');
          const chipType = chip.getAttribute('data-chip');

          // Reset smart flags
          state.filters.recentOnly = false;
          state.filters.trapsOnly = false;
          state.filters.unattemptedOnly = false;
          state.filters.bookmarkedOnly = false;
          state.filters.type = 'ALL';

          const tySel = $('#pyqFilterType'); if (tySel) tySel.value = 'ALL';
          const bmToggle = $('#pyqToggleBookmarked'); if (bmToggle) bmToggle.checked = false;

          if (chipType === 'recent') {
            state.filters.recentOnly = true;
          } else if (chipType === 'statements') {
            state.filters.type = 'statement-based';
            if (tySel) tySel.value = 'statement-based';
          } else if (chipType === 'traps') {
            state.filters.trapsOnly = true;
          } else if (chipType === 'bookmarked') {
            state.filters.bookmarkedOnly = true;
            if (bmToggle) bmToggle.checked = true;
          } else if (chipType === 'unattempted') {
            state.filters.unattemptedOnly = true;
          }

          state.pagination.page = 1;
          applyFiltersAndRender();
        });
      });

      if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
          state.filters.year = e.target.value;
          state.pagination.page = 1;
          applyFiltersAndRender();
        });
      }

      if (topicSelect) {
        topicSelect.addEventListener('change', (e) => {
          state.filters.topic = e.target.value;
          state.pagination.page = 1;
          applyFiltersAndRender();
        });
      }

      if (subTopicSelect) {
        subTopicSelect.addEventListener('change', (e) => {
          state.filters.subTopic = e.target.value;
          state.pagination.page = 1;
          applyFiltersAndRender();
        });
      }

      if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
          state.filters.type = e.target.value;
          state.pagination.page = 1;
          applyFiltersAndRender();
        });
      }

      if (toggleShowAns) {
        toggleShowAns.addEventListener('change', (e) => {
          state.filters.showAllAnswers = e.target.checked;
          applyFiltersAndRender();
        });
      }

      if (toggleBookmarked) {
        toggleBookmarked.addEventListener('change', (e) => {
          state.filters.bookmarkedOnly = e.target.checked;
          state.pagination.page = 1;
          applyFiltersAndRender();
        });
      }

      if (toggleAttempted) {
        toggleAttempted.addEventListener('change', (e) => {
          state.filters.attemptedOnly = e.target.checked;
          state.pagination.page = 1;
          applyFiltersAndRender();
        });
      }

      const viewQuizBtn = $('#pyqViewQuiz');
      if (viewQuestionsBtn && viewAnalyticsBtn) {
        viewQuestionsBtn.addEventListener('click', () => {
          state.currentView = 'questions';
          viewQuestionsBtn.classList.add('pyq-active');
          viewAnalyticsBtn.classList.remove('pyq-active');
          if (viewPdfsBtn) viewPdfsBtn.classList.remove('pyq-active');
          if (viewQuizBtn) viewQuizBtn.classList.remove('pyq-active');
          applyFiltersAndRender();
        });

        if (viewQuizBtn) {
          viewQuizBtn.addEventListener('click', () => {
            state.currentView = 'quiz';
            viewQuizBtn.classList.add('pyq-active');
            viewQuestionsBtn.classList.remove('pyq-active');
            viewAnalyticsBtn.classList.remove('pyq-active');
            if (viewPdfsBtn) viewPdfsBtn.classList.remove('pyq-active');
            applyFiltersAndRender();
          });
        }

        viewAnalyticsBtn.addEventListener('click', () => {
          state.currentView = 'analytics';
          viewAnalyticsBtn.classList.add('pyq-active');
          viewQuestionsBtn.classList.remove('pyq-active');
          if (viewPdfsBtn) viewPdfsBtn.classList.remove('pyq-active');
          if (viewQuizBtn) viewQuizBtn.classList.remove('pyq-active');
          applyFiltersAndRender();
        });

        if (viewPdfsBtn) {
          viewPdfsBtn.addEventListener('click', () => {
            state.currentView = 'pdfs';
            viewPdfsBtn.classList.add('pyq-active');
            viewQuestionsBtn.classList.remove('pyq-active');
            viewAnalyticsBtn.classList.remove('pyq-active');
            if (viewQuizBtn) viewQuizBtn.classList.remove('pyq-active');
            applyFiltersAndRender();
          });
        }
      }

      const heroDailyQuizCard = $('#pyqHeroDailyQuizCard');
      if (heroDailyQuizCard) {
        heroDailyQuizCard.addEventListener('click', () => {
          if (viewQuizBtn) viewQuizBtn.click();
        });
      }

      if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
          const cur = root.getAttribute('data-theme');
          const next = cur === 'dark' ? 'light' : 'dark';
          root.setAttribute('data-theme', next);
          try { localStorage.setItem('pyq_theme_pref', next); } catch(e){}
          themeToggleBtn.querySelector('span:last-child').textContent = next === 'dark' ? 'Dark' : 'Light';
        });

        // Initialize theme preference
        try {
          const savedTheme = localStorage.getItem('pyq_theme_pref');
          if (savedTheme) {
            root.setAttribute('data-theme', savedTheme);
            themeToggleBtn.querySelector('span:last-child').textContent = savedTheme === 'dark' ? 'Dark' : 'Light';
          }
        } catch(e){}
      }
    }

    function resetFilters() {
      state.filters = {
        year: 'ALL',
        topic: 'ALL',
        subTopic: 'ALL',
        type: 'ALL',
        searchQuery: '',
        bookmarkedOnly: false,
        attemptedOnly: false,
        showAllAnswers: false
      };

      const s = $('#pyqSearchInput'); if (s) s.value = '';
      const y = $('#pyqFilterYear'); if (y) y.value = 'ALL';
      const t = $('#pyqFilterTopic'); if (t) t.value = 'ALL';
      const st = $('#pyqFilterSubTopic'); if (st) st.value = 'ALL';
      const ty = $('#pyqFilterType'); if (ty) ty.value = 'ALL';
      const sa = $('#pyqToggleShowAnswers'); if (sa) sa.checked = false;
      const bm = $('#pyqToggleBookmarked'); if (bm) bm.checked = false;
      const at = $('#pyqToggleAttempted'); if (at) at.checked = false;

      state.pagination.page = 1;
      applyFiltersAndRender();
    }

    // 13. UI Feedback Helpers
    function renderLoading(msg) {
      const listContainer = $('#pyqQuestionList');
      if (listContainer) {
        listContainer.innerHTML = `
          <div class="pyq-state-box">
            <div class="pyq-spinner"></div>
            <div class="pyq-state-title">${msg}</div>
            <div class="pyq-state-desc">Loading questions and detailed syllabus analysis...</div>
          </div>
        `;
      }
    }

    function renderError(msg, retryFn) {
      const listContainer = $('#pyqQuestionList');
      if (listContainer) {
        listContainer.innerHTML = `
          <div class="pyq-state-box">
            <div class="pyq-state-icon">⚠️</div>
            <div class="pyq-state-title">Unable to Load Questions</div>
            <div class="pyq-state-desc">${msg}</div>
            <button class="pyq-retry-btn" id="pyqErrRetryBtn">Retry Loading</button>
          </div>
        `;
        const btn = $('#pyqErrRetryBtn');
        if (btn && retryFn) btn.addEventListener('click', retryFn);
      }
    }

    // Bind filters once on startup
    attachFilterListeners();
  }
})();
