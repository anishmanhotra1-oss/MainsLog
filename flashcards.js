/**
 * ============================================================
 * SAANKALP ACTIVE RECALL FLASHCARDS ENGINE
 * Multi-Subject Flashcards for UPSC CSE Prelims (Polity, History, Economy, Geography)
 * Zero Regression — 100% Client-Side with Spaced Repetition (Leitner)
 * ============================================================
 */

;(function flashcardsModule() {
  'use strict';

  const STORAGE_KEY = 'saankalp_flashcards_state_v2';

  // State Management
  const state = {
    currentSubject: 'polity', // 'polity' | 'history' | 'economy' | 'geography' | 'review'
    currentTopic: 'ALL',
    currentIndex: 0,
    isFlipped: false,
    isShuffled: false,
    viewMode: 'card', // 'card' | 'list'
    searchQuery: '',
    onlyNeedPractice: false,
    activeDeck: [],
    // progress: { [cardId]: 'mastered' | 'practice' }
    ratings: {}
  };

  // Load persisted ratings and state
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          state.ratings = parsed.ratings || {};
          if (parsed.currentSubject && ['polity', 'history', 'economy', 'geography', 'review'].includes(parsed.currentSubject)) {
            state.currentSubject = parsed.currentSubject;
          }
          if (parsed.currentTopic) state.currentTopic = parsed.currentTopic;
          if (typeof parsed.viewMode === 'string') state.viewMode = parsed.viewMode;
        }
      }
    } catch (e) {
      console.warn('[Flashcards] Failed to load local state:', e);
    }
  }

  function saveState() {
    try {
      const toSave = {
        ratings: state.ratings,
        currentSubject: state.currentSubject,
        currentTopic: state.currentTopic,
        viewMode: state.viewMode
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('[Flashcards] Failed to save state:', e);
    }
  }

  // Get raw cards from window.FLASHCARDS_DATA
  function getRawSubjectCards(subject) {
    if (!window.FLASHCARDS_DATA) return [];
    if (subject === 'review') {
      // Gather all cards across all subjects marked as 'practice'
      const reviewCards = [];
      const subjects = ['polity', 'history', 'economy', 'geography'];
      subjects.forEach(sub => {
        const cards = window.FLASHCARDS_DATA[sub] || [];
        cards.forEach(c => {
          if (state.ratings[c.id] === 'practice') {
            reviewCards.push(c);
          }
        });
      });
      return reviewCards;
    }
    return window.FLASHCARDS_DATA[subject] || [];
  }

  // Build active deck filtered by topic, search, and practice mode
  function buildActiveDeck() {
    let pool = getRawSubjectCards(state.currentSubject);

    if (state.currentTopic !== 'ALL' && state.currentSubject !== 'review') {
      pool = pool.filter(c => c.chapter === state.currentTopic || c.part === state.currentTopic);
    }

    if (state.onlyNeedPractice && state.currentSubject !== 'review') {
      pool = pool.filter(c => state.ratings[c.id] === 'practice');
    }

    if (state.searchQuery.trim()) {
      const qLower = state.searchQuery.trim().toLowerCase();
      pool = pool.filter(c => 
        (c.q && c.q.toLowerCase().includes(qLower)) ||
        (c.a && c.a.toLowerCase().includes(qLower)) ||
        (c.chapter && c.chapter.toLowerCase().includes(qLower)) ||
        (c.part && c.part.toLowerCase().includes(qLower))
      );
    }

    if (state.isShuffled) {
      // Create a deterministic copy and shuffle
      const copy = [...pool];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
      }
      state.activeDeck = copy;
    } else {
      state.activeDeck = pool;
    }

    if (state.currentIndex >= state.activeDeck.length) {
      state.currentIndex = Math.max(0, state.activeDeck.length - 1);
    }
    state.isFlipped = false;
  }

  // Subjects configuration
  const SUBJECTS = [
    { id: 'polity', name: 'Polity', icon: '⚖️', color: '#2563EB', badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE' },
    { id: 'history', name: 'History & Art', icon: '🏛️', color: '#D97706', badgeBg: '#FFFBEB', badgeBorder: '#FDE68A' },
    { id: 'economy', name: 'Economy', icon: '📈', color: '#059669', badgeBg: '#ECFDF5', badgeBorder: '#A7F3D0' },
    { id: 'geography', name: 'Geography', icon: '🗺️', color: '#0284C7', badgeBg: '#F0F9FF', badgeBorder: '#BAE6FD' },
    { id: 'review', name: 'Review Vault', icon: '★', color: '#DC2626', badgeBg: '#FEF2F2', badgeBorder: '#FECACA' }
  ];

  function getSubjectMeta(subjId) {
    return SUBJECTS.find(s => s.id === subjId) || SUBJECTS[0];
  }

  // Get distinct chapters/topics for dropdown
  function getChaptersForSubject(subject) {
    if (subject === 'review') return [];
    const cards = window.FLASHCARDS_DATA ? (window.FLASHCARDS_DATA[subject] || []) : [];
    const chapters = [];
    const seen = new Set();
    cards.forEach(c => {
      const name = c.chapter || c.part;
      if (name && !seen.has(name)) {
        seen.add(name);
        chapters.push(name);
      }
    });
    return chapters;
  }

  // Calculate statistics
  function calculateStats() {
    let totalAll = 0;
    let masteredAll = 0;
    let practiceAll = 0;

    const subjects = ['polity', 'history', 'economy', 'geography'];
    subjects.forEach(sub => {
      const cards = window.FLASHCARDS_DATA ? (window.FLASHCARDS_DATA[sub] || []) : [];
      totalAll += cards.length;
      cards.forEach(c => {
        const r = state.ratings[c.id];
        if (r === 'mastered') masteredAll++;
        else if (r === 'practice') practiceAll++;
      });
    });

    // Current subject stats
    const curCards = getRawSubjectCards(state.currentSubject);
    let curMastered = 0;
    let curPractice = 0;
    curCards.forEach(c => {
      const r = state.ratings[c.id];
      if (r === 'mastered') curMastered++;
      else if (r === 'practice') curPractice++;
    });

    return {
      totalAll,
      masteredAll,
      practiceAll,
      curTotal: curCards.length,
      curMastered,
      curPractice,
      curDeckTotal: state.activeDeck.length
    };
  }

  // Render HTML UI
  function renderUI() {
    const container = document.getElementById('recallFlashcardsContainer');
    if (!container) return;

    const stats = calculateStats();
    const curSubjectMeta = getSubjectMeta(state.currentSubject);
    const chapters = getChaptersForSubject(state.currentSubject);

    const percent = stats.curTotal > 0 ? Math.round((stats.curMastered / stats.curTotal) * 100) : 0;

    container.innerHTML = `
      <div class="fc-wrapper">
        <!-- HEADER & SUBJECT TABS -->
        <div class="fc-header-card">
          <div class="fc-top-bar">
            <div>
              <div class="fc-pill-badge" style="background: ${curSubjectMeta.badgeBg}; color: ${curSubjectMeta.color}; border: 1px solid ${curSubjectMeta.badgeBorder};">
                <span>${curSubjectMeta.icon}</span>
                <span>UPSC Prelims Active Recall Deck</span>
              </div>
              <h2 class="fc-main-title">Interactive Flashcards Studio</h2>
              <div class="fc-subtitle">Systematic active recall for factual retention, key articles, timelines, and economic concepts.</div>
            </div>

            <div class="fc-quick-actions">
              <button class="fc-action-btn" id="fcSwitchQueuesBtn" onclick="window.switchRecallMode('queues')" title="Return to Revision Queues">
                <span>🔄</span>
                <span>Scheduled Queues</span>
              </button>
            </div>
          </div>

          <!-- SUBJECT SELECTION TABS -->
          <div class="fc-subject-tabs" role="tablist">
            ${SUBJECTS.map(s => {
              const count = s.id === 'review' ? stats.practiceAll : (window.FLASHCARDS_DATA && window.FLASHCARDS_DATA[s.id] ? window.FLASHCARDS_DATA[s.id].length : 0);
              const isActive = s.id === state.currentSubject;
              return `
                <button class="fc-sub-btn ${isActive ? 'fc-active' : ''}" data-subject="${s.id}" role="tab" onclick="window.fcSelectSubject('${s.id}')" aria-selected="${isActive}">
                  <span class="fc-tab-icon">${s.icon}</span>
                  <span class="fc-tab-name">${s.name}</span>
                  <span class="fc-tab-count">${count}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- PROGRESS BAR & STATS -->
          <div class="fc-stats-strip">
            <div class="fc-progress-meta">
              <span><strong>${curSubjectMeta.name} Progress:</strong> ${stats.curMastered} of ${stats.curTotal} Mastered (${percent}%)</span>
              <span class="fc-practice-count" title="Cards marked for further review">🔴 Need Practice: ${stats.curPractice}</span>
            </div>
            <div class="fc-progress-bar-bg">
              <div class="fc-progress-bar-fill" style="width: ${percent}%; background: ${curSubjectMeta.color};"></div>
            </div>
          </div>

          <!-- FILTER BAR (TOPIC, SEARCH, MODES) -->
          <div class="fc-filter-toolbar">
            <div class="fc-filter-group">
              ${state.currentSubject !== 'review' ? `
                <select class="fc-topic-select" id="fcTopicSelect" onchange="window.fcSelectTopic(this.value)" aria-label="Filter by Topic / Chapter">
                  <option value="ALL">All Chapters &amp; Topics (${stats.curTotal})</option>
                  ${chapters.map(ch => `
                    <option value="${ch}" ${state.currentTopic === ch ? 'selected' : ''}>${ch}</option>
                  `).join('')}
                </select>
              ` : `
                <div class="fc-review-note">⚡ Showing ${stats.practiceAll} cards marked as "Need Practice" across all subjects.</div>
              `}
            </div>

            <div class="fc-search-group">
              <span class="fc-search-icon">🔍</span>
              <input type="text" class="fc-search-input" id="fcSearchInput" oninput="window.fcSearch(this.value)" placeholder="Search cards (e.g., Preamble, Harappa, Repo)..." value="${escapeHtml(state.searchQuery)}"/>
              ${state.searchQuery ? `<button class="fc-search-clear" id="fcSearchClearBtn" onclick="window.fcClearSearch()">✕</button>` : ''}
            </div>

            <div class="fc-mode-toggles">
              <button class="fc-toggle-btn ${state.onlyNeedPractice ? 'fc-toggle-on' : ''}" id="fcTogglePracticeOnlyBtn" onclick="window.fcTogglePractice()" title="Filter to show only cards needing practice">
                <span>🔴</span>
                <span class="fc-btn-text">Practice Only</span>
              </button>

              <button class="fc-toggle-btn ${state.isShuffled ? 'fc-toggle-on' : ''}" id="fcToggleShuffleBtn" onclick="window.fcToggleShuffle()" title="Shuffle flashcards order">
                <span>🔀</span>
                <span class="fc-btn-text">Shuffle</span>
              </button>

              <div class="fc-view-switch">
                <button class="fc-view-btn ${state.viewMode === 'card' ? 'fc-view-active' : ''}" id="fcViewCardBtn" onclick="window.fcSwitchView('card')" title="Single Flashcard Focus Mode">
                  🗂️ Card
                </button>
                <button class="fc-view-btn ${state.viewMode === 'list' ? 'fc-view-active' : ''}" id="fcViewListBtn" onclick="window.fcSwitchView('list')" title="Browse All Cards in List Mode">
                  📋 List
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- MAIN FLASHCARD CONTENT AREA -->
        <div class="fc-content-body">
          ${renderContentArea()}
        </div>
      </div>
    `;

    attachEvents();
  }

  function renderContentArea() {
    if (state.activeDeck.length === 0) {
      return `
        <div class="fc-empty-state">
          <div class="fc-empty-icon">🗂️</div>
          <div class="fc-empty-title">No Flashcards Match Your Filter</div>
          <div class="fc-empty-desc">
            ${state.currentSubject === 'review' 
              ? 'Great job! You have no cards marked as "Need Practice". Browse Polity, History, Economy, or Geography to test your recall.'
              : 'Try selecting "All Chapters", clearing your search query, or toggling off "Practice Only".'}
          </div>
          <button class="fc-reset-filter-btn" id="fcResetFiltersBtn" onclick="window.fcResetFilters()">Reset Filters</button>
        </div>
      `;
    }

    if (state.viewMode === 'list') {
      return renderListView();
    }

    return renderCardView();
  }

  // Single Card Focus View
  function renderCardView() {
    const card = state.activeDeck[state.currentIndex];
    if (!card) return '';

    const curRating = state.ratings[card.id];
    const curSubjectMeta = getSubjectMeta(card.subject || state.currentSubject);

    return `
      <div class="fc-card-container">
        <!-- 3D CARD WRAPPER -->
        <div class="fc-card ${state.isFlipped ? 'fc-flipped' : ''}" id="fcInteractiveCard" role="button" tabindex="0" onclick="window.fcFlip()" aria-label="Flashcard. Press Space to flip.">
          <div class="fc-card-inner">
            <!-- FRONT FACE (QUESTION) -->
            <div class="fc-card-face fc-card-front">
              <div class="fc-card-header">
                <div class="fc-card-crumbs">
                  <span class="fc-crumb-subject" style="color: ${curSubjectMeta.color}; background: ${curSubjectMeta.badgeBg};">
                    ${curSubjectMeta.icon} ${curSubjectMeta.name}
                  </span>
                  <span class="fc-crumb-chapter">${escapeHtml(card.chapter || card.part || 'Core Syllabus')}</span>
                </div>
                <div class="fc-card-counter">
                  <span class="fc-count-current">${state.currentIndex + 1}</span>
                  <span class="fc-count-divider">/</span>
                  <span class="fc-count-total">${state.activeDeck.length}</span>
                </div>
              </div>

              <div class="fc-card-body">
                <div class="fc-q-badge">Question</div>
                <div class="fc-question-text">${escapeHtml(card.q)}</div>
              </div>

              <div class="fc-card-footer">
                <div class="fc-flip-prompt">
                  <span class="fc-flip-icon">🔄</span>
                  <span>Tap card or press <b>Space</b> to reveal answer</span>
                </div>
                ${curRating ? `
                  <div class="fc-status-pill ${curRating === 'mastered' ? 'fc-pill-mastered' : 'fc-pill-practice'}">
                    ${curRating === 'mastered' ? '✓ Mastered' : '🔴 Needs Practice'}
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- BACK FACE (ANSWER) -->
            <div class="fc-card-face fc-card-back">
              <div class="fc-card-header">
                <div class="fc-card-crumbs">
                  <span class="fc-crumb-subject" style="color: ${curSubjectMeta.color}; background: ${curSubjectMeta.badgeBg};">
                    ${curSubjectMeta.icon} Key Fact / Answer
                  </span>
                  <span class="fc-crumb-chapter">${escapeHtml(card.chapter || card.part || 'Core Syllabus')}</span>
                </div>
                <div class="fc-card-counter">
                  <span class="fc-count-current">${state.currentIndex + 1}</span>
                  <span class="fc-count-divider">/</span>
                  <span class="fc-count-total">${state.activeDeck.length}</span>
                </div>
              </div>

              <div class="fc-card-body">
                <div class="fc-answer-badge">Answer &amp; High-Yield Insight</div>
                <div class="fc-answer-text">${formatAnswer(card.a)}</div>
              </div>

              <div class="fc-card-footer fc-back-footer">
                <div class="fc-rating-buttons">
                  <button class="fc-rate-btn fc-btn-need-practice ${curRating === 'practice' ? 'fc-rate-selected' : ''}" id="fcRatePracticeBtn" onclick="event.stopPropagation(); window.fcRate('practice')" title="Mark for further review (Key 1)">
                    <span>🔴</span>
                    <span>Need Practice (1)</span>
                  </button>
                  <button class="fc-rate-btn fc-btn-mastered ${curRating === 'mastered' ? 'fc-rate-selected' : ''}" id="fcRateMasteredBtn" onclick="event.stopPropagation(); window.fcRate('mastered')" title="Mark as mastered (Key 2)">
                    <span>🟢</span>
                    <span>Mastered (2)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CONTROLS TOOLBAR -->
        <div class="fc-controls-bar">
          <button class="fc-nav-btn" id="fcPrevBtn" ${state.currentIndex === 0 ? 'disabled' : ''} onclick="window.fcPrev()" title="Previous Card (←)">
            <span>◀</span>
            <span class="fc-ctrl-lbl">Prev</span>
          </button>

          <button class="fc-flip-btn" id="fcFlipBtn" onclick="window.fcFlip()" title="Flip Card (Space)">
            <span>🔄</span>
            <span>Flip Card</span>
          </button>

          <button class="fc-nav-btn" id="fcNextBtn" ${state.currentIndex >= state.activeDeck.length - 1 ? 'disabled' : ''} title="Next Card (→)">
            <span class="fc-ctrl-lbl">Next</span>
            <span>▶</span>
          </button>
        </div>

        <!-- KEYBOARD SHORTCUTS LEGEND -->
        <div class="fc-shortcuts-legend">
          <span>Shortcuts: <b>Space</b> Flip | <b>← / →</b> Prev / Next | <b>1</b> Need Practice | <b>2</b> Mastered</span>
        </div>
      </div>
    `;
  }

  // Browse All List View
  function renderListView() {
    return `
      <div class="fc-list-container">
        <div class="fc-list-header">
          <span>Showing <b>${state.activeDeck.length}</b> flashcards in list view</span>
          <button class="fc-list-focus-btn" id="fcListSwitchFocusBtn">🗂️ Switch to Card View</button>
        </div>

        <div class="fc-cards-grid">
          ${state.activeDeck.map((c, i) => {
            const r = state.ratings[c.id];
            const meta = getSubjectMeta(c.subject || state.currentSubject);
            return `
              <div class="fc-grid-item" data-index="${i}">
                <div class="fc-grid-top">
                  <span class="fc-grid-ch" style="color: ${meta.color};">${escapeHtml(c.chapter || c.part)}</span>
                  <div class="fc-grid-badge ${r === 'mastered' ? 'fc-badge-mastered' : (r === 'practice' ? 'fc-badge-practice' : '')}">
                    ${r === 'mastered' ? '✓ Mastered' : (r === 'practice' ? '🔴 Practice' : `#${i + 1}`)}
                  </div>
                </div>

                <div class="fc-grid-q"><strong>Q:</strong> ${escapeHtml(c.q)}</div>
                <div class="fc-grid-a"><strong>A:</strong> ${formatAnswer(c.a)}</div>

                <div class="fc-grid-actions">
                  <button class="fc-grid-btn fc-grid-practice-btn ${r === 'practice' ? 'fc-grid-active' : ''}" data-act="rate-practice" data-cid="${c.id}">
                    🔴 Review
                  </button>
                  <button class="fc-grid-btn fc-grid-master-btn ${r === 'mastered' ? 'fc-grid-active' : ''}" data-act="rate-master" data-cid="${c.id}">
                    🟢 Mastered
                  </button>
                  <button class="fc-grid-btn fc-grid-open-btn" data-act="open-card" data-index="${i}">
                    🗂️ Study This
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function formatAnswer(txt) {
    if (!txt) return '';
    // Format semicolons into clean bullet-like spans if multiple clauses
    const escaped = escapeHtml(txt);
    const clauses = escaped.split('; ');
    if (clauses.length > 2) {
      return clauses.map((c, idx) => `
        <span class="fc-clause-item">
          <span class="fc-clause-bullet">•</span>
          <span>${c}</span>
        </span>
      `).join('');
    }
    return escaped;
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

  // Attach interactive listeners
  function attachEvents() {
    // Return to queues button
    const returnBtn = document.getElementById('fcSwitchQueuesBtn');
    if (returnBtn && window.switchRecallMode) {
      returnBtn.addEventListener('click', () => window.switchRecallMode('queues'));
    }

    // Subject tabs
    document.querySelectorAll('.fc-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const subj = btn.getAttribute('data-subject');
        if (subj && subj !== state.currentSubject) {
          state.currentSubject = subj;
          state.currentTopic = 'ALL';
          state.currentIndex = 0;
          buildActiveDeck();
          saveState();
          renderUI();
        }
      });
    });

    // Topic dropdown
    const topicSelect = document.getElementById('fcTopicSelect');
    if (topicSelect) {
      topicSelect.addEventListener('change', (e) => {
        state.currentTopic = e.target.value;
        state.currentIndex = 0;
        buildActiveDeck();
        saveState();
        renderUI();
      });
    }

    // Search input
    const searchInput = document.getElementById('fcSearchInput');
    if (searchInput) {
      let debounceTimeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          state.searchQuery = e.target.value;
          state.currentIndex = 0;
          buildActiveDeck();
          renderUI();
        }, 250);
      });
    }

    // Search clear
    const searchClear = document.getElementById('fcSearchClearBtn');
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        state.searchQuery = '';
        state.currentIndex = 0;
        buildActiveDeck();
        renderUI();
      });
    }

    // Practice only toggle
    const togglePractice = document.getElementById('fcTogglePracticeOnlyBtn');
    if (togglePractice) {
      togglePractice.addEventListener('click', () => {
        state.onlyNeedPractice = !state.onlyNeedPractice;
        state.currentIndex = 0;
        buildActiveDeck();
        renderUI();
      });
    }

    // Shuffle toggle
    const toggleShuffle = document.getElementById('fcToggleShuffleBtn');
    if (toggleShuffle) {
      toggleShuffle.addEventListener('click', () => {
        state.isShuffled = !state.isShuffled;
        state.currentIndex = 0;
        buildActiveDeck();
        renderUI();
      });
    }

    // View switcher
    const viewCardBtn = document.getElementById('fcViewCardBtn');
    const viewListBtn = document.getElementById('fcViewListBtn');
    const listSwitchFocus = document.getElementById('fcListSwitchFocusBtn');

    if (viewCardBtn) {
      viewCardBtn.addEventListener('click', () => {
        state.viewMode = 'card';
        saveState();
        renderUI();
      });
    }
    if (viewListBtn) {
      viewListBtn.addEventListener('click', () => {
        state.viewMode = 'list';
        saveState();
        renderUI();
      });
    }
    if (listSwitchFocus) {
      listSwitchFocus.addEventListener('click', () => {
        state.viewMode = 'card';
        saveState();
        renderUI();
      });
    }

    // Reset filters
    const resetBtn = document.getElementById('fcResetFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.currentTopic = 'ALL';
        state.searchQuery = '';
        state.onlyNeedPractice = false;
        state.isShuffled = false;
        state.currentIndex = 0;
        buildActiveDeck();
        renderUI();
      });
    }

    // Card Flip & Navigation in Focus View
    const cardEl = document.getElementById('fcInteractiveCard');
    const flipBtn = document.getElementById('fcFlipBtn');
    const prevBtn = document.getElementById('fcPrevBtn');
    const nextBtn = document.getElementById('fcNextBtn');

    // Flip is handled by window.fcFlip(event) on onclick attributes.
    // We attach an explicit click listener only if onclick is somehow suppressed,
    // guarded by window.fcFlip's internal 200ms debounce and DOM check.
    if (cardEl) {
      cardEl.onclick = (e) => {
        if (e && e.target && e.target.closest && e.target.closest('.fc-rate-btn')) return;
        window.fcFlip(e);
      };
    }
    if (flipBtn) {
      flipBtn.onclick = (e) => {
        window.fcFlip(e);
      };
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (state.currentIndex > 0) {
          state.currentIndex--;
          state.isFlipped = false;
          renderUI();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (state.currentIndex < state.activeDeck.length - 1) {
          state.currentIndex++;
          state.isFlipped = false;
          renderUI();
        }
      });
    }

    // Rating buttons
    const ratePractice = document.getElementById('fcRatePracticeBtn');
    const rateMastered = document.getElementById('fcRateMasteredBtn');

    if (ratePractice) {
      ratePractice.addEventListener('click', (e) => {
        e.stopPropagation();
        const curCard = state.activeDeck[state.currentIndex];
        if (curCard) {
          state.ratings[curCard.id] = 'practice';
          saveState();
          // Advance card
          if (state.currentIndex < state.activeDeck.length - 1) {
            state.currentIndex++;
            state.isFlipped = false;
          }
          renderUI();
        }
      });
    }

    if (rateMastered) {
      rateMastered.addEventListener('click', (e) => {
        e.stopPropagation();
        const curCard = state.activeDeck[state.currentIndex];
        if (curCard) {
          state.ratings[curCard.id] = 'mastered';
          saveState();
          // Advance card
          if (state.currentIndex < state.activeDeck.length - 1) {
            state.currentIndex++;
            state.isFlipped = false;
          }
          renderUI();
        }
      });
    }

    // Grid item action buttons in List View
    document.querySelectorAll('.fc-grid-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const act = btn.getAttribute('data-act');
        const cid = btn.getAttribute('data-cid');
        const idx = parseInt(btn.getAttribute('data-index'), 10);

        if (act === 'rate-practice' && cid) {
          state.ratings[cid] = 'practice';
          saveState();
          renderUI();
        } else if (act === 'rate-master' && cid) {
          state.ratings[cid] = 'mastered';
          saveState();
          renderUI();
        } else if (act === 'open-card' && !isNaN(idx)) {
          state.currentIndex = idx;
          state.viewMode = 'card';
          state.isFlipped = false;
          renderUI();
        }
      });
    });

    // Touch Swipe gestures on mobile (with distance and duration validation)
    if (cardEl) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      cardEl.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        touchStartTime = Date.now();
      }, { passive: true });

      cardEl.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        const duration = Date.now() - touchStartTime;
        // Fast horizontal swipe > 55px in under 450ms
        if (Math.abs(diffX) > 55 && Math.abs(diffX) > Math.abs(diffY) * 1.5 && duration < 450) {
          if (diffX < 0 && state.currentIndex < state.activeDeck.length - 1) {
            window.fcNext();
          } else if (diffX > 0 && state.currentIndex > 0) {
            window.fcPrev();
          }
        }
      }, { passive: true });
    }
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    // Only process if flashcard container is visible and in view
    const container = document.getElementById('recallFlashcardsContainer');
    if (!container || container.style.display === 'none') return;
    if (state.viewMode !== 'card') return;

    // Ignore if typing in an input
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target && e.target.tagName) || '')) return;

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      const cardEl = document.getElementById('fcInteractiveCard');
      if (cardEl) {
        state.isFlipped = !state.isFlipped;
        cardEl.classList.toggle('fc-flipped', state.isFlipped);
      }
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
      e.preventDefault();
      if (state.currentIndex < state.activeDeck.length - 1) {
        state.currentIndex++;
        state.isFlipped = false;
        renderUI();
      }
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (state.currentIndex > 0) {
        state.currentIndex--;
        state.isFlipped = false;
        renderUI();
      }
    } else if (e.key === '1') {
      // 1 = Need Practice
      const curCard = state.activeDeck[state.currentIndex];
      if (curCard) {
        state.ratings[curCard.id] = 'practice';
        saveState();
        if (state.currentIndex < state.activeDeck.length - 1) {
          state.currentIndex++;
          state.isFlipped = false;
        }
        renderUI();
      }
    } else if (e.key === '2') {
      // 2 = Mastered
      const curCard = state.activeDeck[state.currentIndex];
      if (curCard) {
        state.ratings[curCard.id] = 'mastered';
        saveState();
        if (state.currentIndex < state.activeDeck.length - 1) {
          state.currentIndex++;
          state.isFlipped = false;
        }
        renderUI();
      }
    }
  });

  // Global init function
  
  // EXPOSE GLOBAL ACTIONS ON WINDOW FOR 100% BULLETPROOF ONCLICK COMPATIBILITY
  let lastFlipTimestamp = 0;
  window.fcFlip = function(e) {
    if (e) {
      // Do not flip if clicking rating button or list buttons
      if (e.target && e.target.closest && e.target.closest('.fc-rate-btn')) {
        return;
      }
    }
    const now = Date.now();
    if (now - lastFlipTimestamp < 200) {
      return; // Ignore duplicate synthetic micro-events
    }
    lastFlipTimestamp = now;

    const cardEl = document.getElementById('fcInteractiveCard');
    if (!cardEl) return;

    // Direct DOM-level check ensures 100% synchronization
    const currentlyFlipped = cardEl.classList.contains('fc-flipped');
    state.isFlipped = !currentlyFlipped;
    cardEl.classList.toggle('fc-flipped', state.isFlipped);
  };

  window.fcNext = function() {
    if (state.currentIndex < state.activeDeck.length - 1) {
      state.currentIndex++;
      state.isFlipped = false;
      renderUI();
    }
  };

  window.fcPrev = function() {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      state.isFlipped = false;
      renderUI();
    }
  };

  window.fcRate = function(rating) {
    const curCard = state.activeDeck[state.currentIndex];
    if (curCard) {
      state.ratings[curCard.id] = rating;
      saveState();
      if (state.currentIndex < state.activeDeck.length - 1) {
        state.currentIndex++;
        state.isFlipped = false;
      }
      renderUI();
    }
  };

  window.fcRateCardId = function(cid, rating) {
    if (cid) {
      state.ratings[cid] = rating;
      saveState();
      renderUI();
    }
  };

  window.fcSelectSubject = function(subj) {
    if (subj && subj !== state.currentSubject) {
      state.currentSubject = subj;
      state.currentTopic = 'ALL';
      state.currentIndex = 0;
      state.isFlipped = false;
      buildActiveDeck();
      saveState();
      renderUI();
    }
  };

  window.fcSelectTopic = function(topic) {
    state.currentTopic = topic;
    state.currentIndex = 0;
    state.isFlipped = false;
    buildActiveDeck();
    saveState();
    renderUI();
  };

  window.fcSearch = function(query) {
    state.searchQuery = query || '';
    state.currentIndex = 0;
    state.isFlipped = false;
    buildActiveDeck();
    renderUI();
  };

  window.fcClearSearch = function() {
    state.searchQuery = '';
    state.currentIndex = 0;
    state.isFlipped = false;
    buildActiveDeck();
    renderUI();
  };

  window.fcTogglePractice = function() {
    state.onlyNeedPractice = !state.onlyNeedPractice;
    state.currentIndex = 0;
    state.isFlipped = false;
    buildActiveDeck();
    renderUI();
  };

  window.fcToggleShuffle = function() {
    state.isShuffled = !state.isShuffled;
    state.currentIndex = 0;
    state.isFlipped = false;
    buildActiveDeck();
    renderUI();
  };

  window.fcSwitchView = function(view) {
    state.viewMode = view;
    saveState();
    renderUI();
  };

  window.fcResetFilters = function() {
    state.currentTopic = 'ALL';
    state.searchQuery = '';
    state.onlyNeedPractice = false;
    state.isShuffled = false;
    state.currentIndex = 0;
    state.isFlipped = false;
    buildActiveDeck();
    renderUI();
  };

  window.fcStudyIndex = function(idx) {
    state.currentIndex = idx;
    state.viewMode = 'card';
    state.isFlipped = false;
    renderUI();
  };

  window.initFlashcardsModule = function() {
    loadState();
    buildActiveDeck();
    renderUI();
    if ((!window.FLASHCARDS_DATA || !window.FLASHCARDS_DATA.polity) && typeof window !== 'undefined') {
      let attempts = 0;
      const retryTimer = setInterval(() => {
        attempts++;
        if (window.FLASHCARDS_DATA && window.FLASHCARDS_DATA.polity) {
          clearInterval(retryTimer);
          buildActiveDeck();
          renderUI();
        } else if (attempts > 60) {
          clearInterval(retryTimer);
        }
      }, 80);
    }
  };

  // Auto-init on DOMContentLoaded or immediately
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', window.initFlashcardsModule);
    } else {
      setTimeout(window.initFlashcardsModule, 10);
    }
  }

})();
