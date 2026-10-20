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
      if (state.currentView === 'analytics') {
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
      if (qBtn) qBtn.classList.add('pyq-active');
      if (aBtn) aBtn.classList.remove('pyq-active');
      if (pBtn) pBtn.classList.remove('pyq-active');
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

      if (viewQuestionsBtn && viewAnalyticsBtn) {
        viewQuestionsBtn.addEventListener('click', () => {
          state.currentView = 'questions';
          viewQuestionsBtn.classList.add('pyq-active');
          viewAnalyticsBtn.classList.remove('pyq-active');
          if (viewPdfsBtn) viewPdfsBtn.classList.remove('pyq-active');
          applyFiltersAndRender();
        });

        viewAnalyticsBtn.addEventListener('click', () => {
          state.currentView = 'analytics';
          viewAnalyticsBtn.classList.add('pyq-active');
          viewQuestionsBtn.classList.remove('pyq-active');
          if (viewPdfsBtn) viewPdfsBtn.classList.remove('pyq-active');
          applyFiltersAndRender();
        });

        if (viewPdfsBtn) {
          viewPdfsBtn.addEventListener('click', () => {
            state.currentView = 'pdfs';
            viewPdfsBtn.classList.add('pyq-active');
            viewQuestionsBtn.classList.remove('pyq-active');
            viewAnalyticsBtn.classList.remove('pyq-active');
            applyFiltersAndRender();
          });
        }
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
