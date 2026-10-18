/**
 * ============================================================
 * EXAMPLES BANK MODULE (eb_ / eb- prefix throughout)
 * Self-contained IIFE — touches NOTHING outside #tab-examples-bank
 * ============================================================
 * Storage   : localStorage key "EB_ENTRIES_v1"  +  cloud sync
 *             via the existing /api/sync endpoint (EB_ENTRIES key).
 * PDF       : jsPDF + jsPDF-AutoTable (loaded from CDN on demand).
 * Auth      : None (matches existing app pattern — no login anywhere).
 * ============================================================
 */

;(function ebModule() {
  'use strict';

  /* ─── CONSTANTS ─────────────────────────────────────────── */
  const LS_KEY        = 'EB_ENTRIES_v1';
  const SYNC_URL      = '/api/sync';
  const PARTS         = ['GS1', 'GS2', 'GS3', 'GS4'];
  const TYPES         = ['Example', 'Thinker', 'Case Study'];
  const JSPDF_CDN     = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const AUTOTABLE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';

  const PART_DETAILS = {
    GS1: { title: 'GS1', name: 'History, Society & Geography' },
    GS2: { title: 'GS2', name: 'Polity, Governance & IR' },
    GS3: { title: 'GS3', name: 'Economy, S&T, Env & Security' },
    GS4: { title: 'GS4', name: 'Ethics, Integrity & Aptitude' }
  };

  const STARTER_SEEDS = {
    GS1: [
      { type: 'Example', title: 'Bhakti Movement', purpose: 'Social egalitarianism, challenging rigid caste hierarchies & vernacular democratization of religion.', tag: 'Society', source: 'NCERT Class 11' },
      { type: 'Case Study', title: 'Chipko Movement (1973)', purpose: 'Ecofeminism, non-violent grassroots mobilization & community stewardship of forests.', tag: 'Environment', source: 'Modern India' },
      { type: 'Thinker', title: 'Dadabhai Naoroji & R.C. Dutt', purpose: 'Drain of Wealth theory; critical foundation of economic nationalism against colonial extraction.', tag: 'History', source: 'Poverty & Un-British Rule' }
    ],
    GS2: [
      { type: 'Case Study', title: 'S.R. Bommai v. Union of India (1994)', purpose: 'Checks arbitrary use of Art. 356, establishes federalism and secularism as Basic Structure of Constitution.', tag: 'Federalism', source: 'Supreme Court of India' },
      { type: 'Example', title: 'Mission Karmayogi', purpose: 'Competency-driven civil service capacity reform transitioning bureaucracy from rule-based to role-based governance.', tag: 'Governance', source: 'DoPT / NITI Aayog' },
      { type: 'Thinker', title: '2nd ARC Recommendations', purpose: 'Code of ethics for ministers, decentralized vigilance, Citizen Charters with grievance redressal.', tag: 'Accountability', source: '2nd ARC 4th Report' }
    ],
    GS3: [
      { type: 'Case Study', title: 'Kudumbashree Model (Kerala)', purpose: 'Women-led community network for micro-credit, neighborhood governance & holistic poverty eradication.', tag: 'Poverty', source: 'Economic Survey' },
      { type: 'Example', title: 'JAM Trinity & UPI Public Rails', purpose: 'Plugging fiscal leakages in DBT welfare, financial inclusion & global-standard digital public infrastructure.', tag: 'DigitalGov', source: 'Ministry of Finance' },
      { type: 'Case Study', title: 'Sikkim 100% Organic Farming', purpose: 'Agro-ecological sustainability, soil microbiome conservation & zero chemical pesticide runoffs.', tag: 'Agriculture', source: 'FAO Gold Policy Award' }
    ],
    GS4: [
      { type: 'Thinker', title: 'John Rawls — Veil of Ignorance', purpose: 'Justice as Fairness: moral decision-making designing institutions to maximize outcomes for the least advantaged.', tag: 'Ethics', source: 'A Theory of Justice' },
      { type: 'Case Study', title: 'E. Sreedharan (Metro Man)', purpose: 'Exemplary probity in public life, punctuality, zero toleration of bribery, and steadfast institutional integrity.', tag: 'Integrity', source: 'DMRC Case Ledger' },
      { type: 'Thinker', title: 'Immanuel Kant — Categorical Imperative', purpose: 'Deontological morality: duty for duty’s sake; never using individuals merely as instruments to an end.', tag: 'Morality', source: 'Groundwork of Metaphysics' }
    ]
  };

  /* ─── STATE ─────────────────────────────────────────────── */
  let eb_state = {
    entries   : [],          // all eb_entries
    activePart: 'GS1',       // active tab
    editingId : null,        // id being edited (null = new)
    filters   : {            // per-part filter state
      GS1: { type: '', tag: '', keyword: '' },
      GS2: { type: '', tag: '', keyword: '' },
      GS3: { type: '', tag: '', keyword: '' },
      GS4: { type: '', tag: '', keyword: '' }
    },
    groupBy   : 'date',      // 'date' | 'type' (for PDF)
    viewMode  : 'grid',      // 'grid' | 'list'
    sortBy    : 'newest',    // 'newest' | 'oldest' | 'title'
    syncing   : false,
    formOpen  : false
  };

  /* ─── HELPERS ────────────────────────────────────────────── */

  function eb_escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function eb_uid() {
    return 'eb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function eb_fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch (e) { return iso; }
  }

  function eb_today() {
    return new Date().toISOString().slice(0, 10);
  }

  function eb_el(id) { return document.getElementById(id); }

  function eb_showToast(msg, type = 'success') {
    const t = eb_el('ebToast');
    if (!t) return;
    t.textContent  = msg;
    t.className    = 'eb-toast eb-toast-' + type + ' eb-toast-visible';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.classList.remove('eb-toast-visible');
    }, 2800);
  }

  function eb_setLoading(show) {
    const s = eb_el('ebSpinner');
    if (s) s.style.display = show ? 'flex' : 'none';
  }

  function eb_setError(msg) {
    const e = eb_el('ebErrorBanner');
    if (!e) return;
    if (msg) {
      e.textContent = msg;
      e.style.display = 'block';
    } else {
      e.style.display = 'none';
    }
  }

  function eb_copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        console.warn('[EB] Copy fallback error:', e);
      }
      document.body.removeChild(ta);
      return Promise.resolve();
    }
  }

  /* ─── STORAGE: localStorage ──────────────────────────────── */

  function eb_loadFromLS() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        eb_state.entries = JSON.parse(raw);
        return true;
      }
    } catch (e) { /* ignore */ }
    eb_state.entries = [];
    return false;
  }

  function eb_saveToLS() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(eb_state.entries));
    } catch (e) {
      eb_showToast('⚠️ Local save failed — storage may be full', 'error');
    }
  }

  /* ─── STORAGE: Cloud sync ────────────────────────────────── */

  function eb_mergeEntries(local, remote) {
    const map = new Map();
    local.forEach(e => { if (e && e.id) map.set(e.id, e); });
    remote.forEach(e => {
      if (!e || !e.id) return;
      if (!map.has(e.id)) {
        map.set(e.id, e);
      } else {
        const lo = map.get(e.id);
        const loTime = new Date(lo.updated_at || lo.created_at || 0).getTime();
        const reTime = new Date(e.updated_at  || e.created_at  || 0).getTime();
        map.set(e.id, reTime >= loTime ? e : lo);
      }
    });
    return Array.from(map.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async function eb_pullCloud() {
    try {
      const res = await fetch(SYNC_URL, { method: 'GET' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data && Array.isArray(data.EB_ENTRIES)) {
        eb_state.entries = eb_mergeEntries(eb_state.entries, data.EB_ENTRIES);
        eb_saveToLS();
      }
    } catch (e) {
      console.warn('[EB] Cloud pull failed:', e);
    }
  }

  async function eb_pushCloud() {
    try {
      await fetch(SYNC_URL, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ EB_ENTRIES: eb_state.entries })
      });
    } catch (e) {
      console.warn('[EB] Cloud push failed:', e);
    }
  }

  /* ─── HERO STATS SYNCHRONIZER ────────────────────────────── */

  function eb_updateHeroStats() {
    PARTS.forEach(part => {
      const cnt = eb_state.entries.filter(e => e.gs_part === part).length;
      const el = eb_el('ebStat' + part);
      if (el) el.textContent = cnt;
      const card = eb_el('ebStatCard' + part);
      if (card) {
        if (part === eb_state.activePart) {
          card.classList.add('active-stat');
        } else {
          card.classList.remove('active-stat');
        }
      }
    });

    const exCount = eb_state.entries.filter(e => e.type === 'Example').length;
    const thCount = eb_state.entries.filter(e => e.type === 'Thinker').length;
    const csCount = eb_state.entries.filter(e => e.type === 'Case Study').length;

    const elEx = eb_el('ebCountExample');
    if (elEx) elEx.textContent = exCount;
    const elTh = eb_el('ebCountThinker');
    if (elTh) elTh.textContent = thCount;
    const elCs = eb_el('ebCountCase');
    if (elCs) elCs.textContent = csCount;
  }

  /* ─── FORM DRAWER CONTROLS ───────────────────────────────── */

  function eb_toggleForm(forceOpen) {
    const formSection = eb_el('ebFormSection');
    const heroBtn = eb_el('ebHeroAddBtn');
    const heroIcon = eb_el('ebHeroAddIcon');
    const heroLabel = eb_el('ebHeroAddLabel');
    if (!formSection) return;

    if (forceOpen !== undefined) {
      eb_state.formOpen = forceOpen;
    } else {
      eb_state.formOpen = !eb_state.formOpen;
    }

    if (eb_state.formOpen) {
      formSection.classList.remove('collapsed');
      if (heroIcon) heroIcon.textContent = '✕';
      if (heroLabel) heroLabel.textContent = 'Close Drawer';
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      formSection.classList.add('collapsed');
      if (heroIcon) heroIcon.textContent = '＋';
      if (heroLabel) heroLabel.textContent = 'Add New Entry';
    }
  }

  function eb_setType(type) {
    if (!TYPES.includes(type)) return;
    const sel = eb_el('ebFormType');
    if (sel) sel.value = type;

    // Update pill buttons
    const pills = document.querySelectorAll('.eb-type-pill-btn');
    pills.forEach(btn => {
      if (btn.getAttribute('data-type') === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function eb_applyTag(tag) {
    const input = eb_el('ebFormTag');
    if (!input) return;
    const cur = input.value.trim();
    if (!cur) {
      input.value = tag;
    } else if (!cur.toLowerCase().includes(tag.toLowerCase())) {
      input.value = cur + ', ' + tag;
    }
    input.focus();
  }

  function eb_readForm() {
    const gsPart = eb_el('ebFormGsPart') ? eb_el('ebFormGsPart').value : eb_state.activePart;
    const typeEl = eb_el('ebFormType');
    const type   = typeEl ? typeEl.value.trim() : 'Example';
    const title  = eb_el('ebFormTitle').value.trim();
    const purpose= eb_el('ebFormPurpose').value.trim();
    const tag    = eb_el('ebFormTag').value.trim();
    const source = eb_el('ebFormSource').value.trim();

    if (!title)   { eb_showToast('⚠️ Please enter a title', 'error'); return { ok: false, data: null }; }
    if (!purpose) { eb_showToast('⚠️ Please enter the purpose/where to use', 'error'); return { ok: false, data: null }; }
    if (!TYPES.includes(type)) { eb_showToast('⚠️ Please select a valid type', 'error'); return { ok: false, data: null }; }

    return {
      ok: true,
      data: {
        gs_part: gsPart,
        type,
        title,
        purpose,
        tag,
        source
      }
    };
  }

  function eb_clearForm() {
    ['ebFormTitle', 'ebFormPurpose', 'ebFormTag', 'ebFormSource'].forEach(id => {
      const el = eb_el(id);
      if (el) el.value = '';
    });
    eb_setType('Example');
    eb_state.editingId = null;

    const btn = eb_el('ebFormSaveBtn');
    if (btn) {
      btn.innerHTML = '<span>💾</span> Save Entry';
      btn.style.background = '';
    }
    const head = eb_el('ebFormHeading');
    if (head) head.textContent = 'Add New Entry';
    const icon = eb_el('ebFormIcon');
    if (icon) icon.textContent = '✏️';

    eb_toggleForm(false);
  }

  async function eb_saveEntry() {
    const { ok, data } = eb_readForm();
    if (!ok) return;

    const now = new Date().toISOString();

    if (eb_state.editingId) {
      // EDIT
      const idx = eb_state.entries.findIndex(e => e.id === eb_state.editingId);
      if (idx !== -1) {
        eb_state.entries[idx] = {
          ...eb_state.entries[idx],
          ...data,
          updated_at: now
        };
        eb_showToast('✅ Entry updated successfully!');
      }
      eb_state.editingId = null;
    } else {
      // NEW
      const entry = {
        id        : eb_uid(),
        ...data,
        created_at: now,
        updated_at: now
      };
      eb_state.entries.unshift(entry);
      eb_showToast('✅ Saved to ' + data.gs_part + '!');
    }

    eb_saveToLS();
    eb_clearForm();
    eb_renderCurrentPart();
    eb_pushCloud();
  }

  function eb_editEntry(id) {
    const entry = eb_getEntry(id);
    if (!entry) return;

    eb_state.editingId = id;
    eb_toggleForm(true);

    const setVal = (elId, val) => { const el = eb_el(elId); if (el) el.value = val || ''; };
    setVal('ebFormGsPart', entry.gs_part);
    eb_setType(entry.type);
    setVal('ebFormTitle',  entry.title);
    setVal('ebFormPurpose',entry.purpose);
    setVal('ebFormTag',    entry.tag);
    setVal('ebFormSource', entry.source);

    const head = eb_el('ebFormHeading');
    if (head) head.textContent = 'Edit Entry';

    const icon = eb_el('ebFormIcon');
    if (icon) icon.textContent = '📝';

    const btn = eb_el('ebFormSaveBtn');
    if (btn) {
      btn.innerHTML = '<span>✓</span> Update Entry';
      btn.style.background = 'linear-gradient(135deg, #D97706 0%, #B45309 100%)';
    }
  }

  function eb_deleteEntry(id) {
    const entry = eb_getEntry(id);
    const label = entry ? `"${entry.title}"` : 'this entry';
    if (!confirm(`Delete ${label}?\nThis action cannot be undone.`)) return;
    eb_state.entries = eb_state.entries.filter(e => e.id !== id);
    eb_saveToLS();
    eb_showToast('🗑️ Entry deleted');
    eb_renderCurrentPart();
    eb_pushCloud();
  }

  function eb_copyEntry(id) {
    const entry = eb_getEntry(id);
    if (!entry) return;

    const text = [
      `📌 ${entry.title} (${entry.type} • ${entry.gs_part})`,
      `🎯 Purpose / Mains Answer Usage:`,
      `${entry.purpose}`,
      entry.source ? `📖 Source: ${entry.source}` : '',
      entry.tag ? `🏷️ Tag: #${entry.tag}` : ''
    ].filter(Boolean).join('\n');

    eb_copyText(text).then(() => {
      eb_showToast('📋 Copied formatted note to clipboard!');
    });
  }

  function eb_loadStarter(part, type, title, purpose, tag, source) {
    eb_toggleForm(true);
    const setVal = (elId, val) => { const el = eb_el(elId); if (el) el.value = val || ''; };
    setVal('ebFormGsPart', part);
    eb_setType(type);
    setVal('ebFormTitle', title);
    setVal('ebFormPurpose', purpose);
    setVal('ebFormTag', tag);
    setVal('ebFormSource', source);

    const head = eb_el('ebFormHeading');
    if (head) head.textContent = 'Add Recommended Seed (' + part + ')';
    eb_showToast('💡 Template loaded! Review and click Save.');
  }

  /* ─── FILTER & SORT ───────────────────────────────────────── */

  function eb_filteredEntries(part) {
    const f = eb_state.filters[part] || {};
    let list = eb_state.entries.filter(e => {
      if (e.gs_part !== part) return false;
      if (f.type    && e.type    !== f.type) return false;
      if (f.tag     && !(e.tag    || '').toLowerCase().includes(f.tag.toLowerCase())) return false;
      if (f.keyword) {
        const kw = f.keyword.toLowerCase();
        const inTitle   = (e.title   || '').toLowerCase().includes(kw);
        const inPurpose = (e.purpose || '').toLowerCase().includes(kw);
        const inTag     = (e.tag     || '').toLowerCase().includes(kw);
        const inSource  = (e.source  || '').toLowerCase().includes(kw);
        if (!inTitle && !inPurpose && !inTag && !inSource) return false;
      }
      return true;
    });

    // Sort
    if (eb_state.sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (eb_state.sortBy === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      // newest first
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return list;
  }

  function eb_updateFilter(part, key, value) {
    eb_state.filters[part] = eb_state.filters[part] || {};
    eb_state.filters[part][key] = value;
    eb_renderCurrentPart();
  }

  function eb_clearFilters(part) {
    eb_state.filters[part] = { type: '', tag: '', keyword: '' };
    eb_renderCurrentPart();
  }

  function eb_setViewMode(mode) {
    eb_state.viewMode = mode;
    eb_renderCurrentPart();
  }

  function eb_setSortBy(val) {
    eb_state.sortBy = val;
    eb_renderCurrentPart();
  }

  /* ─── RENDER ─────────────────────────────────────────────── */

  function eb_renderTabs() {
    const strip = eb_el('ebPartTabs');
    if (!strip) return;

    strip.innerHTML = PARTS.map(part => {
      const count = eb_state.entries.filter(e => e.gs_part === part).length;
      const active = part === eb_state.activePart ? 'eb-tab-active' : '';
      const details = PART_DETAILS[part] || { title: part, name: '' };
      return `
        <button class="eb-tab-btn ${active}" onclick="EBModule.switchPart('${part}')" 
                id="ebTab${part}" aria-selected="${part === eb_state.activePart}">
          <div class="eb-tab-btn-header">
            <span class="eb-tab-title">${details.title}</span>
            <span class="eb-tab-count">${count}</span>
          </div>
          <div class="eb-tab-subtitle">${details.name}</div>
        </button>
      `;
    }).join('');
  }

  function eb_renderCurrentPart() {
    eb_updateHeroStats();
    eb_renderTabs();
    eb_renderPartPanel(eb_state.activePart);
  }

  function eb_renderPartPanel(part) {
    const panelEl = eb_el('ebPartPanel');
    if (!panelEl) return;

    const filtered = eb_filteredEntries(part);
    const total    = eb_state.entries.filter(e => e.gs_part === part).length;
    const f        = eb_state.filters[part] || {};

    const hasFilter = Boolean(f.type || f.tag || f.keyword);
    const isList = eb_state.viewMode === 'list';

    panelEl.innerHTML = `
      <!-- Modern Toolbar Card -->
      <div class="eb-toolbar-card">
        <div class="eb-toolbar-row-top">
          <!-- Search box -->
          <div class="eb-search-wrapper">
            <span class="eb-search-icon">🔍</span>
            <input type="text" class="eb-search-input" id="ebFilterSearch"
                   placeholder="Search title, thinker, purpose, citation…"
                   value="${eb_escape(f.keyword || '')}"
                   oninput="EBModule.updateFilter('${part}', 'keyword', this.value)" />
            ${f.keyword ? `<button class="eb-search-clear" onclick="EBModule.updateFilter('${part}', 'keyword', '')">✕</button>` : ''}
          </div>

          <!-- Sort dropdown -->
          <select class="eb-sort-select" onchange="EBModule.setSortBy(this.value)">
            <option value="newest" ${eb_state.sortBy === 'newest' ? 'selected' : ''}>⏳ Newest Added</option>
            <option value="oldest" ${eb_state.sortBy === 'oldest' ? 'selected' : ''}>⌛ Oldest First</option>
            <option value="title" ${eb_state.sortBy === 'title' ? 'selected' : ''}>🔤 Title (A–Z)</option>
          </select>

          <!-- Grid / List Toggle -->
          <div class="eb-view-toggle">
            <button class="eb-view-btn ${!isList ? 'active' : ''}" onclick="EBModule.setViewMode('grid')" title="Grid View">⊞ Grid</button>
            <button class="eb-view-btn ${isList ? 'active' : ''}" onclick="EBModule.setViewMode('list')" title="Compact List View">☰ List</button>
          </div>
        </div>

        <div class="eb-toolbar-row-bottom">
          <!-- Filter type pills -->
          <div class="eb-type-chips">
            <button class="eb-filter-chip ${!f.type ? 'active' : ''}" onclick="EBModule.updateFilter('${part}', 'type', '')">
              All Types (${total})
            </button>
            ${TYPES.map(t => {
              const active = f.type === t ? 'active' : '';
              const icon = t === 'Example' ? '💡' : t === 'Thinker' ? '🧠' : '📑';
              const cnt = eb_state.entries.filter(e => e.gs_part === part && e.type === t).length;
              return `<button class="eb-filter-chip ${active}" onclick="EBModule.updateFilter('${part}', 'type', '${t}')">${icon} ${t} (${cnt})</button>`;
            }).join('')}
            ${hasFilter ? `<button class="eb-filter-chip" style="color:var(--crimson);border-color:#FCA5A5;" onclick="EBModule.clearFilters('${part}')">✕ Reset</button>` : ''}
          </div>

          <!-- Export Actions -->
          <div class="eb-export-group">
            <button class="eb-btn-export-pill pdf-active" onclick="EBModule.downloadPartPdf('${part}')" ${total === 0 ? 'disabled title="No entries yet"' : ''}>
              📄 ${part} PDF
            </button>
            <button class="eb-btn-export-pill" onclick="EBModule.downloadAllPdf()" ${eb_state.entries.length === 0 ? 'disabled title="No entries yet"' : ''}>
              📦 All GS1–4
            </button>
            <button class="eb-btn-export-pill" onclick="EBModule.exportJson()">
              ⬇ Backup
            </button>
            <div class="eb-groupby-row" style="margin-left: 6px;">
              <span class="eb-groupby-label">PDF:</span>
              <button class="eb-groupby-btn ${eb_state.groupBy === 'date' ? 'active' : ''}" onclick="EBModule.setGroupBy('date')">📅 Date</button>
              <button class="eb-groupby-btn ${eb_state.groupBy === 'type' ? 'active' : ''}" onclick="EBModule.setGroupBy('type')">📂 Type</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Entries Container -->
      <div id="ebEntriesList${part}" class="${isList ? 'eb-cards-list' : 'eb-cards-grid'}">
        ${filtered.length === 0 ? eb_emptyState(part, hasFilter) : filtered.map(eb_renderCard).join('')}
      </div>
    `;
  }

  function eb_emptyState(part, isFiltered) {
    if (isFiltered) {
      return `
        <div class="eb-empty-state" style="grid-column: 1 / -1;">
          <div class="eb-empty-icon-wrap">🔍</div>
          <div class="eb-empty-title">No matching entries found</div>
          <div class="eb-empty-sub">No entries match your current search and filter criteria.</div>
          <button class="eb-filter-chip active" onclick="EBModule.clearFilters('${part}')">✕ Clear Filters</button>
        </div>
      `;
    }

    const seeds = STARTER_SEEDS[part] || [];

    return `
      <div class="eb-empty-state" style="grid-column: 1 / -1;">
        <div class="eb-empty-icon-wrap">📚</div>
        <div class="eb-empty-title">Your ${part} Thought-Bank is Empty</div>
        <div class="eb-empty-sub">
          Start recording high-scoring examples, ethical thinker quotes, and pilot case studies for your Mains answers.
        </div>
        <button class="eb-btn-hero-add" style="margin: 0 auto;" onclick="EBModule.toggleForm(true)">
          ＋ Add First Entry to ${part}
        </button>

        ${seeds.length > 0 ? `
          <div class="eb-starter-box">
            <div class="eb-starter-title">🚀 Quick Start — Load a Recommended UPSC Seed:</div>
            <div class="eb-starter-grid">
              ${seeds.map(s => {
                const icon = s.type === 'Example' ? '💡' : s.type === 'Thinker' ? '🧠' : '📑';
                return `
                  <button class="eb-starter-chip" onclick="EBModule.loadStarter('${part}', '${s.type}', '${eb_escape(s.title)}', '${eb_escape(s.purpose)}', '${eb_escape(s.tag)}', '${eb_escape(s.source)}')">
                    <span>${icon}</span>
                    <span>${eb_escape(s.title)}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function eb_renderCard(entry) {
    const typeMeta = {
      'Example': { cls: 'eb-type-example', icon: '💡', cardCls: 'card-type-example' },
      'Thinker': { cls: 'eb-type-thinker', icon: '🧠', cardCls: 'card-type-thinker' },
      'Case Study': { cls: 'eb-type-case', icon: '📑', cardCls: 'card-type-case' }
    }[entry.type] || { cls: 'eb-type-example', icon: '💡', cardCls: 'card-type-example' };

    const tagHtml = entry.tag
      ? `<span class="eb-entry-tag" onclick="EBModule.updateFilter('${entry.gs_part}', 'tag', '${eb_escape(entry.tag)}')">#${eb_escape(entry.tag)}</span>`
      : '';
    const srcHtml = entry.source
      ? `<div class="eb-entry-source-line"><span>📖</span> <span>${eb_escape(entry.source)}</span></div>`
      : '';
    const dateHtml = entry.created_at
      ? `<div class="eb-meta-right">Added ${eb_fmtDate(entry.created_at)}</div>`
      : '';

    return `
      <div class="eb-entry-card ${typeMeta.cardCls}" id="ebCard${entry.id}">
        <div class="eb-card-top-meta">
          <div class="eb-meta-left">
            <span class="eb-entry-type-badge ${typeMeta.cls}">${typeMeta.icon} ${eb_escape(entry.type)}</span>
            ${tagHtml}
          </div>
          ${dateHtml}
        </div>

        <div class="eb-entry-title">${eb_escape(entry.title)}</div>

        <div class="eb-entry-purpose-box">
          <div class="eb-purpose-kicker">🎯 MAINS VALUE ADDITION &amp; USAGE:</div>
          <div class="eb-entry-purpose-text">${eb_escape(entry.purpose)}</div>
        </div>

        ${srcHtml}

        <div class="eb-card-footer">
          <span style="font-size:11px; font-weight:800; color:var(--text-muted);">${entry.gs_part}</span>
          <div class="eb-card-action-btns">
            <button class="eb-btn-card-action eb-btn-copy" onclick="EBModule.copyEntry('${entry.id}')" title="Copy to clipboard">
              📋 Copy
            </button>
            <button class="eb-btn-card-action eb-btn-edit" onclick="EBModule.editEntry('${entry.id}')" title="Edit entry">
              ✏️ Edit
            </button>
            <button class="eb-btn-card-action eb-btn-delete" onclick="EBModule.deleteEntry('${entry.id}')" title="Delete entry">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ─── PDF GENERATION ─────────────────────────────────────── */

  let eb_jspdfLoaded = false;

  function eb_loadJsPdf() {
    return new Promise((resolve, reject) => {
      if (eb_jspdfLoaded) { resolve(); return; }
      const s1 = document.createElement('script');
      s1.src = JSPDF_CDN;
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = AUTOTABLE_CDN;
        s2.onload = () => { eb_jspdfLoaded = true; resolve(); };
        s2.onerror = () => reject(new Error('AutoTable load failed'));
        document.head.appendChild(s2);
      };
      s1.onerror = () => reject(new Error('jsPDF load failed'));
      document.head.appendChild(s1);
    });
  }

  async function eb_generatePdf(parts, filename) {
    eb_setLoading(true);
    try {
      await eb_loadJsPdf();
      await eb_pullCloud();
      eb_renderCurrentPart();

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const dateStr = eb_today();
      const totalAll = parts.reduce((sum, p) =>
        sum + eb_state.entries.filter(e => e.gs_part === p).length, 0);

      let yPos = 0;

      parts.forEach((part, pi) => {
        const partEntries = eb_state.entries.filter(e => e.gs_part === part);

        if (pi > 0) doc.addPage();

        /* Cover block */
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, 210, 32, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(`${part} — Examples, Thinkers & Case Studies`, 14, 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Generated: ${dateStr}   |   Section entries: ${partEntries.length}`, 14, 22);

        if (parts.length > 1) {
          doc.text(`Paper ${pi + 1} of ${parts.length}   |   Grand total: ${totalAll}`, 14, 28);
        }

        doc.setTextColor(0, 0, 0);
        yPos = 38;

        if (partEntries.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(11);
          doc.text('No entries recorded for this paper.', 14, yPos + 10);
          return;
        }

        let rows = [];
        let tableEntries = [...partEntries];

        if (eb_state.groupBy === 'type') {
          const grouped = {};
          TYPES.forEach(t => { grouped[t] = []; });
          tableEntries.forEach(e => {
            if (grouped[e.type]) grouped[e.type].push(e);
            else (grouped['Example'] = grouped['Example'] || []).push(e);
          });
          let num = 1;
          TYPES.forEach(t => {
            (grouped[t] || []).forEach(e => {
              rows.push([
                num++,
                e.type,
                e.title,
                e.purpose,
                e.tag || '',
                e.source || '',
                eb_fmtDate(e.created_at)
              ]);
            });
          });
        } else {
          tableEntries.forEach((e, i) => {
            rows.push([
              i + 1,
              e.type,
              e.title,
              e.purpose,
              e.tag || '',
              e.source || '',
              eb_fmtDate(e.created_at)
            ]);
          });
        }

        doc.autoTable({
          startY      : yPos,
          head        : [['#', 'Type', 'Title', 'Purpose / Usage', 'Tag', 'Source', 'Added']],
          body        : rows,
          theme       : 'striped',
          headStyles  : {
            fillColor  : [15, 23, 42],
            textColor  : [255, 255, 255],
            fontStyle  : 'bold',
            fontSize   : 8
          },
          bodyStyles  : { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 8,  halign: 'center' },
            1: { cellWidth: 22 },
            2: { cellWidth: 35 },
            3: { cellWidth: 60 },
            4: { cellWidth: 22 },
            5: { cellWidth: 30 },
            6: { cellWidth: 18, halign: 'center' }
          },
          didDrawPage: (data) => {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(
              `Page ${data.pageNumber}  |  ${part} — Saankalp Examples Bank`,
              14, 290
            );
            doc.text(`Generated ${dateStr}`, 170, 290, { align: 'right' });
            doc.setTextColor(0, 0, 0);
          }
        });
      });

      doc.save(filename);
      eb_showToast('📄 PDF exported successfully!');
    } catch (err) {
      console.error('[EB] PDF error:', err);
      eb_setError('PDF generation failed: ' + err.message);
      eb_showToast('❌ PDF export failed', 'error');
    } finally {
      eb_setLoading(false);
    }
  }

  async function eb_downloadPartPdf(part) {
    const count = eb_state.entries.filter(e => e.gs_part === part).length;
    if (count === 0) {
      eb_showToast(`⚠️ No entries in ${part} to export`, 'error');
      return;
    }
    await eb_generatePdf([part], `${part}_Examples_${eb_today()}.pdf`);
  }

  async function eb_downloadAllPdf() {
    if (eb_state.entries.length === 0) {
      eb_showToast('⚠️ No entries to export', 'error');
      return;
    }
    await eb_generatePdf(PARTS, `GS1-GS4_Examples_${eb_today()}.pdf`);
  }

  /* ─── JSON EXPORT ────────────────────────────────────────── */

  function eb_exportJson() {
    const data = JSON.stringify(eb_state.entries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `EB_Backup_${eb_today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    eb_showToast('⬇ JSON backup downloaded!');
  }

  /* ─── TAB SWITCHING ──────────────────────────────────────── */

  function eb_switchPart(part) {
    if (!PARTS.includes(part)) return;
    eb_state.activePart = part;
    const sel = eb_el('ebFormGsPart');
    if (sel) sel.value = part;
    eb_renderCurrentPart();
  }

  /* ─── INIT ───────────────────────────────────────────────── */

  async function eb_init() {
    eb_loadFromLS();
    eb_setLoading(true);
    eb_setError(null);
    try {
      await eb_pullCloud();
    } catch (e) {
      eb_setError('Cloud sync offline — using local storage.');
    } finally {
      eb_setLoading(false);
    }
    eb_renderCurrentPart();
  }

  /* ─── PUBLIC API (attached to window.EBModule) ───────────── */

  window.EBModule = {
    init            : eb_init,
    switchPart      : eb_switchPart,
    updateFilter    : eb_updateFilter,
    clearFilters    : eb_clearFilters,
    saveEntry       : eb_saveEntry,
    editEntry       : eb_editEntry,
    deleteEntry     : eb_deleteEntry,
    cancelEdit      : function() { eb_clearForm(); eb_renderCurrentPart(); },
    downloadPartPdf : eb_downloadPartPdf,
    downloadAllPdf  : eb_downloadAllPdf,
    exportJson      : eb_exportJson,
    setGroupBy      : function(val) {
      eb_state.groupBy = val;
      eb_renderCurrentPart();
      eb_showToast('PDF order: ' + (val === 'type' ? 'Grouped by Type' : 'Date Added'));
    },
    toggleForm      : eb_toggleForm,
    setType         : eb_setType,
    applyTag        : eb_applyTag,
    copyEntry       : eb_copyEntry,
    setViewMode     : eb_setViewMode,
    setSortBy       : eb_setSortBy,
    loadStarter     : eb_loadStarter
  };

  /* ─── TAB NAVIGATION HOOK ────────────────────────────────── */

  let eb_initialized = false;

  document.addEventListener('click', function(e) {
    const tabBtn = e.target.closest('[data-tab]');
    if (!tabBtn) return;
    if (tabBtn.getAttribute('data-tab') !== 'tab-examples-bank') return;

    if (!eb_initialized) {
      eb_initialized = true;
      eb_init();
    } else {
      eb_renderCurrentPart();
    }
  }, false);

  window.addEventListener('load', function() {
    if (window.location.hash === '#examples-bank') {
      setTimeout(function() {
        if (typeof switchTab === 'function') switchTab('tab-examples-bank');
        if (!eb_initialized) {
          eb_initialized = true;
          eb_init();
        }
      }, 300);
    }
  });

})();
