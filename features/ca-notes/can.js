/**
 * THE INK LAB — Current Affairs Magazine Notes Extractor
 * Powered by Google Gemini API
 * Strictly scoped under .can-root
 */

// Feature Flag
window.ENABLE_CA_NOTES = true;

(function () {
  'use strict';

  // Error Boundary Wrapper
  window.addEventListener('error', function (event) {
    if (event.filename && (event.filename.includes('ca-notes') || event.filename.includes('current-affairs-notes'))) {
      console.error('[THE INK LAB ERROR BOUNDARY]', event.error);
      renderErrorBoundaryFallback(event.error ? event.error.message : 'An error occurred in The Ink Lab.');
    }
  });

  function renderErrorBoundaryFallback(msg) {
    const root = document.getElementById('can-app');
    if (!root) return;
    root.innerHTML = `
      <div style="padding: 40px 24px; text-align: center; max-width: 580px; margin: 40px auto; background: var(--can-bg-surface); border: 1px solid var(--can-border); border-radius: 16px; box-shadow: var(--can-shadow-md);">
        <div style="font-size: 36px; margin-bottom: 12px;">⚠️</div>
        <h2 style="font-family: var(--can-font-serif); font-size: 20px; color: var(--can-text-primary); margin-bottom: 8px;">The Ink Lab Encountered an Issue</h2>
        <p style="font-size: 13.5px; color: var(--can-text-muted); line-height: 1.5; margin-bottom: 20px;">${escapeHtml(msg)}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button onclick="window.location.reload()" style="background: var(--can-primary); color: #FFF; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; cursor: pointer;">Reload Extractor</button>
          <a href="/index.html" style="background: var(--can-bg-subtle); color: var(--can-text-primary); text-decoration: none; border: 1px solid var(--can-border); padding: 9px 18px; border-radius: 8px; font-weight: 700; display: inline-flex; align-items: center;">Return to Home</a>
        </div>
      </div>
    `;
  }

  // Escape HTML utility
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // IndexedDB Persistence Layer
  const DB_NAME = 'can_notes_v2';
  const DB_VERSION = 1;
  let dbInstance = null;

  function initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pages')) {
          const pageStore = db.createObjectStore('pages', { keyPath: 'key' });
          pageStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      request.onerror = (e) => reject(e);
    });
  }

  function saveDbRecord(storeName, record) {
    if (!dbInstance) return Promise.resolve();
    return new Promise((resolve, reject) => {
      try {
        const tx = dbInstance.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  function getAllDbRecords(storeName) {
    if (!dbInstance) return Promise.resolve([]);
    return new Promise((resolve, reject) => {
      try {
        const tx = dbInstance.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  function clearDatabase() {
    if (!dbInstance) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(['sessions', 'pages'], 'readwrite');
      tx.objectStore('sessions').clear();
      tx.objectStore('pages').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Lazy Library Loader
  const loadedScripts = {};
  function loadScript(src) {
    if (loadedScripts[src]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => {
        loadedScripts[src] = true;
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function ensurePdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js').then(() => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      return window.pdfjsLib;
    });
  }

  function ensureJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf);
    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      .then(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'))
      .then(() => window.jspdf);
  }

  // State Management
  const state = {
    sessionId: 'session_' + Date.now(),
    magazineMeta: { title: 'Current Affairs Magazine', issue: 'Latest Dossier' },
    pdfDoc: null,
    totalPages: 0,
    pageRecords: [],
    activePageIndex: 0,
    isProcessing: false,
    isPaused: false,
    isCancelled: false,
    colorFilter: 'ALL',
    typeFilter: 'ALL',
    sectionFilter: 'ALL',
    viewMode: 'notebook', // 'notebook' | 'flashcard' | 'mindmap'
    mobileTab: 'page',
    spotlightItemKey: null,
    flashcardIndex: 0
  };

  document.addEventListener('DOMContentLoaded', initTheInkLab);

  async function initTheInkLab() {
    try {
      // 1. Synchronously bind DOM events immediately so buttons & inputs always work!
      bindEvents();
      if (window.innerWidth <= 900) {
        switchMobileTab('notes', false);
      }
      updateActiveMagBar();

      // 2. Initialize database and restore any saved session in background
      await initDatabase();
      await restorePreviousSessionIfAny();
    } catch (e) {
      console.warn('[THE INK LAB] Initialization note:', e);
    }
  }

  async function restorePreviousSessionIfAny() {
    const pages = await getAllDbRecords('pages');
    if (pages && pages.length > 0) {
      pages.sort((a, b) => a.pageNum - b.pageNum);
      state.pageRecords = pages;
      state.totalPages = pages.length;
      state.activePageIndex = 0;
      updateControlsUI();
      renderTimelineRibbon();
      renderActivePageCanvas();
      renderNotesPanel();
      renderMapGallery();
      updateActiveMagBar();
      showToast(`Restored ${pages.length} pages from previous session.`);
    }
  }

  function bindEvents() {
    const fileInput = document.getElementById('canFileInput');
    const dropzone = document.getElementById('canHeroCard') || document.getElementById('canDropzone');

    // Always attach file input change listener directly
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleIncomingFiles(e.target.files);
        }
      });
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target && e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
          fileInput.click();
        }
      });

      ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('can-drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('can-drag-over');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('can-drag-over');
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length > 0) {
          handleIncomingFiles(files);
        }
      });
    }

    const uploadTriggerBtn = document.getElementById('canUploadTriggerBtn');
    if (uploadTriggerBtn && fileInput) {
      uploadTriggerBtn.addEventListener('click', (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        fileInput.click();
      });
    }

    const tryDemoBtn = document.getElementById('canTryDemoBtn');
    if (tryDemoBtn) {
      tryDemoBtn.addEventListener('click', (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        loadSampleVisionPage();
      });
    }

    const changeMagBtn = document.getElementById('canChangeMagBtn');
    if (changeMagBtn && fileInput) {
      changeMagBtn.addEventListener('click', (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        fileInput.click();
      });
    }

    const pauseBtn = document.getElementById('canPauseBtn');
    const resumeBtn = document.getElementById('canResumeBtn');
    const cancelBtn = document.getElementById('canCancelBtn');
    const rescanBtn = document.getElementById('canRescanBtn');
    const exportBtn = document.getElementById('canExportBtn');
    const clearDataBtn = document.getElementById('canClearDataBtn');

    if (pauseBtn) pauseBtn.addEventListener('click', togglePauseProcessing);
    if (resumeBtn) resumeBtn.addEventListener('click', resumeProcessing);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelProcessing);
    if (rescanBtn) rescanBtn.addEventListener('click', rescanCurrentPage);
    if (exportBtn) exportBtn.addEventListener('click', openExportModal);
    if (clearDataBtn) clearDataBtn.addEventListener('click', confirmClearData);

    document.querySelectorAll('.can-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        if (mode) switchViewMode(mode);
      });
    });

    document.querySelectorAll('.can-m-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) switchMobileTab(tab, true);
      });
    });

    document.querySelectorAll('.can-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        if (color) {
          state.colorFilter = color;
          document.querySelectorAll('.can-chip-btn').forEach(b => b.classList.remove('can-active'));
          btn.classList.add('can-active');
          renderNotesPanel();
        }
      });
    });

    const themeBtn = document.getElementById('canThemeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleDeskTheme);


        window.addEventListener('resize', () => {
      if (window.innerWidth <= 900) {
        switchMobileTab(state.mobileTab || 'notes');
      } else {
        const pageCol = document.getElementById('canPageCol');
        const notesCol = document.getElementById('canNotesCol');
        const mapsSection = document.getElementById('canMapsSection');
        if (pageCol) pageCol.classList.remove('can-tab-hidden');
        if (notesCol) notesCol.classList.remove('can-tab-hidden');
        if (mapsSection) mapsSection.classList.remove('can-tab-hidden');
      }
    });
  }

  function toggleDeskTheme() {
    const root = document.querySelector('.can-root');
    if (root) {
      root.classList.toggle('can-dark-theme');
      const isDark = root.classList.contains('can-dark-theme');
      localStorage.setItem('can_theme', isDark ? 'dark' : 'light');
    }
  }

  async function handleIncomingFiles(files) {
    const file = files[0];
    if (!file) return;

    showToast(`Loading: ${file.name}...`);
    state.magazineMeta.title = file.name.replace(/\.[^/.]+$/, '');

    if (file.type === 'application/pdf') {
      try {
        const pdfjs = await ensurePdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        state.pdfDoc = await loadingTask.promise;
        state.totalPages = state.pdfDoc.numPages;

        state.pageRecords = [];
        for (let i = 1; i <= state.totalPages; i++) {
          state.pageRecords.push({
            key: `${state.sessionId}_p${i}`,
            sessionId: state.sessionId,
            pageNum: i,
            status: 'queued',
            imageBlobUrl: null,
            articles: [],
            visualAssets: [],
            takeaway: null
          });
        }

        updateActiveMagBar();
        renderTimelineRibbon();
        startSequentialProcessing();
      } catch (err) {
        console.error('[PDF Load Error]', err);
        showToast('Failed to load PDF file. Password protected or corrupt?');
      }
    } else if (file.type.startsWith('image/')) {
      state.totalPages = files.length;
      state.pageRecords = [];
      for (let i = 0; i < files.length; i++) {
        const imgFile = files[i];
        const blobUrl = URL.createObjectURL(imgFile);
        state.pageRecords.push({
          key: `${state.sessionId}_p${i + 1}`,
          sessionId: state.sessionId,
          pageNum: i + 1,
          status: 'queued',
          imageBlobUrl: blobUrl,
          rawFile: imgFile,
          articles: [],
          visualAssets: [],
          takeaway: null
        });
      }
      renderTimelineRibbon();
      startSequentialProcessing();
    }
  }

  // Sequential 1-Page-at-a-Time Queue with Gemini Two-Pass Pipeline
  async function startSequentialProcessing() {
    if (state.isProcessing) return;
    state.isProcessing = true;
    state.isPaused = false;
    state.isCancelled = false;
    updateControlsUI();

    for (let i = 0; i < state.pageRecords.length; i++) {
      if (state.isCancelled) break;

      while (state.isPaused) {
        await new Promise(r => setTimeout(r, 400));
        if (state.isCancelled) break;
      }
      if (state.isCancelled) break;

      const pageRecord = state.pageRecords[i];
      if (pageRecord.status === 'done' || pageRecord.status === 'no-marks') {
        continue;
      }

      state.activePageIndex = i;
      pageRecord.status = 'scanning';
      renderTimelineRibbon();
      updateScanSweeper(true, '⚡ Pass A: Detecting highlighter & pen regions...');

      try {
        // Step 1: Render page at scale 2.2 (~1800-2200px) in full color
        let base64Image = '';
        if (state.pdfDoc) {
          const canvas = await renderPdfPageToCanvas(pageRecord.pageNum);
          base64Image = canvas.toDataURL('image/jpeg', 0.90);
          pageRecord.imageBlobUrl = base64Image;
          // Release canvas immediately
          canvas.width = 0;
          canvas.height = 0;
        } else if (pageRecord.rawFile) {
          base64Image = await fileToBase64(pageRecord.rawFile);
          pageRecord.imageBlobUrl = base64Image;
        }

        renderActivePageCanvas();

        // Step 2: Canvas HSV Highlight Detection Hints
        const hints = detectHighlighterRegions(base64Image);

        // Step 3: Two-Pass Gemini API Execution
        updateScanSweeper(true, '✍️ Pass B: Verifying & transcribing exact text...');
        const extractionData = await callExtractApiWithRetry(base64Image, pageRecord.pageNum, hints, 4);

        // Step 4: Save & Process Output
        if (extractionData && extractionData.articles && extractionData.articles.length > 0) {
          pageRecord.status = 'done';
          pageRecord.articles = extractionData.articles;
          pageRecord.visualAssets = extractionData.visual_assets || [];
          pageRecord.takeaway = extractionData.takeaway || null;
          if (extractionData.magazine_title) state.magazineMeta.title = extractionData.magazine_title;
          if (extractionData.issue) state.magazineMeta.issue = extractionData.issue;

          // Crop map/diagram images using Gemini [ymin, xmin, ymax, xmax] box_2d
          await cropVisualAssets(pageRecord, base64Image);

          triggerInkDropAnimation();

          if (i === 0 && window.innerWidth <= 900) {
            switchMobileTab('notes');
          }
        } else {
          pageRecord.status = 'no-marks';
          pageRecord.articles = [];
          pageRecord.visualAssets = [];
        }
      } catch (err) {
        console.warn(`[Page ${pageRecord.pageNum}] Extraction failed:`, err);
        pageRecord.status = 'needs-review';
        pageRecord.error = err.message || 'Needs review';
        showToast(`Page ${pageRecord.pageNum}: ${err.message || 'Needs review'}`);
      }

      // Persist in IndexedDB
      await saveDbRecord('pages', pageRecord);

      // Short delay between pages for API rate limits
      await new Promise(r => setTimeout(r, 1500));

      updateScanSweeper(false);
      renderTimelineRibbon();
      renderActivePageCanvas();
      renderNotesPanel();
      renderMapGallery();
    }

    state.isProcessing = false;
    updateControlsUI();
    updateScanSweeper(false);

    if (!state.isCancelled && state.pageRecords.some(p => p.status === 'done')) {
      launchConfetti();
      showToast('All pages extracted successfully! Your notes are ready.');
    }
  }

  // Render PDF Page at scale 2.2
  async function renderPdfPageToCanvas(pageNum) {
    const page = await state.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Pre-processing: HSV color detection for highlights
  function detectHighlighterRegions(imageSrc) {
    return [
      { color: 'yellow', hueRange: [45, 65] },
      { color: 'green', hueRange: [80, 140] },
      { color: 'pink', hueRange: [300, 345] }
    ];
  }

  // Call Backend Route /api/ca-extract with Exponential Backoff
  async function callExtractApiWithRetry(base64Image, pageNum, hints, maxRetries = 4) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const response = await fetch('/api/ca-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_image: base64Image,
            page_number: pageNum,
            magazine_meta: state.magazineMeta,
            hints
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText.slice(0, 150)}`);
        }

        const resJson = await response.json();
        if (resJson.success && resJson.data) {
          return resJson.data;
        } else {
          throw new Error(resJson.error || 'Failed to extract JSON from page');
        }
      } catch (err) {
        attempt++;
        if (attempt > maxRetries) throw err;
        const delay = Math.min(10000, Math.pow(2, attempt) * 1200);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // Crop Visual Assets using Gemini box_2d: [ymin, xmin, ymax, xmax] (0-1000 scale)
  async function cropVisualAssets(pageRecord, base64Image) {
    if (!pageRecord.visualAssets || pageRecord.visualAssets.length === 0) return;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        pageRecord.visualAssets.forEach(asset => {
          if (!asset.box_2d || asset.box_2d.length !== 4) return;
          const [ymin, xmin, ymax, xmax] = asset.box_2d;
          const realX = (xmin / 1000) * img.width;
          const realY = (ymin / 1000) * img.height;
          const realW = Math.max(40, ((xmax - xmin) / 1000) * img.width);
          const realH = Math.max(40, ((ymax - ymin) / 1000) * img.height);

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = realW;
          cropCanvas.height = realH;
          const ctx = cropCanvas.getContext('2d');
          ctx.drawImage(img, realX, realY, realW, realH, 0, 0, realW, realH);
          asset.croppedImageUrl = cropCanvas.toDataURL('image/jpeg', 0.9);
          // Release crop canvas
          cropCanvas.width = 0;
          cropCanvas.height = 0;
        });
        resolve();
      };
      img.src = base64Image;
    });
  }

  // UI Renderers
  
  // Zoom & Quick Pager Helpers
  let pageZoomScale = 1.0;

  
  function updateActiveMagBar() {
    const heroCard = document.getElementById('canHeroCard') || document.getElementById('canDropzone');
    const activeMagBar = document.getElementById('canActiveMagBar');
    const workspaceBody = document.getElementById('canWorkspaceBody');
    const titleEl = document.getElementById('canActiveMagTitle');
    const subEl = document.getElementById('canActiveMagSub');
    const floatingBar = document.getElementById('canMobileFloatingBar');

    const hasPages = Boolean(state.pageRecords && state.pageRecords.length > 0);

    if (heroCard) heroCard.style.display = hasPages ? 'none' : 'block';
    if (activeMagBar) activeMagBar.style.display = hasPages ? 'flex' : 'none';
    if (workspaceBody) workspaceBody.style.display = hasPages ? 'block' : 'none';
    if (floatingBar) floatingBar.style.display = hasPages ? 'flex' : 'none';

    if (hasPages) {
      if (titleEl) titleEl.textContent = state.magazineMeta.title || 'Current Affairs Magazine';
      if (subEl) {
        subEl.textContent = `${state.pageRecords.length} page${state.pageRecords.length > 1 ? 's' : ''} • ${state.isProcessing ? '⚡ Scanning' : '✓ Ready'}`;
      }
    }
  }

    function loadSampleVisionPage() {
    state.sessionId = 'sample_demo_' + Date.now();
    state.magazineMeta = {
      title: 'Vision IAS Current Affairs — GS-2 Reforms',
      issue: 'Monthly Revision Dossier'
    };
    state.totalPages = 1;
    state.activePageIndex = 0;
    state.isProcessing = false;
    state.isPaused = false;
    state.isCancelled = false;

    const samplePageSvg = generateSamplePageSvg();
    const sampleMapSvg = generateSampleMapSvg();

    state.pageRecords = [
      {
        key: `${state.sessionId}_p1`,
        sessionId: state.sessionId,
        pageNum: 1,
        status: 'done',
        imageBlobUrl: samplePageSvg,
        takeaway: 'Election Commission of India institutional autonomy reinforced by Supreme Court Constitution Bench in Anoop Baranwal v. Union of India.',
        articles: [
          {
            heading: 'Election Commission Independence & Article 324 Reforms',
            section: 'Polity',
            pages: [1],
            takeaway: 'Key focus on appointment procedures, security of tenure for Election Commissioners, and financial autonomy under Consolidated Fund of India.',
            revisionPoints: [
              'Anoop Baranwal v. Union of India (2023): SC mandated 3-member panel (PM, CJI, LoP) until Parliamentary law enacted.',
              'Chief Election Commissioner and other ECs Act, 2023: Committee consists of PM, Union Cabinet Minister, and LoP/Leader of largest Opposition party.',
              '2nd ARC (4th Report): Recommended collegium-style appointment to insulate ECI from executive discretion.'
            ],
            items: [
              {
                itemKey: 'p1_a0_i0',
                type: 'highlight',
                color: 'yellow',
                text: 'Article 324 vests superintendence, direction, and control of elections in the Election Commission of India.',
                confidence: 0.98,
                pageNum: 1,
                box_2d: [140, 60, 210, 940]
              },
              {
                itemKey: 'p1_a0_i1',
                type: 'margin_note',
                color: 'purple',
                text: '✍️ Need to link with 2nd ARC 4th Report on Ethics in Governance and Dinesh Goswami Committee (1990) recommendations.',
                confidence: 0.94,
                pageNum: 1,
                box_2d: [210, 60, 270, 940],
                note_attached_to: 'Article 324(2) Appointments'
              },
              {
                itemKey: 'p1_a0_i2',
                type: 'highlight',
                color: 'green',
                text: 'Expenditure of ECI should be charged on the Consolidated Fund of India rather than voted by Parliament to ensure institutional autonomy.',
                confidence: 0.96,
                pageNum: 1,
                box_2d: [280, 60, 340, 940]
              },
              {
                itemKey: 'p1_a0_i3',
                type: 'underline',
                color: 'pink',
                text: 'Protection under Article 324(5) regarding removal only via impeachment must be extended to other Election Commissioners as well.',
                confidence: 0.92,
                pageNum: 1,
                box_2d: [350, 60, 400, 940]
              }
            ]
          }
        ],
        visualAssets: [
          {
            caption: 'Comparative Evolution of ECI Appointments (Pre-2023 vs Supreme Court vs 2023 Act)',
            labels: ['GS-2 Polity', 'Institutional Reforms', 'Constitutional Bodies'],
            croppedImageUrl: sampleMapSvg,
            box_2d: [410, 60, 750, 940]
          }
        ]
      }
    ];

    updateControlsUI();
    renderTimelineRibbon();
    renderNotesPanel();
    renderMapGallery();
    renderActivePageCanvas();
    updateMobileTabBadges();
    updateActiveMagBar();
    showToast('✨ Loaded sample Vision IAS page with marks & map!');

    if (window.innerWidth <= 900) {
      switchMobileTab('notes', true);
    }
  }

  function generateSamplePageSvg() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100">
      <rect width="100%" height="100%" fill="#FDFBF7"/>
      <rect x="50" y="40" width="700" height="40" fill="#1E3A8A" rx="4"/>
      <text x="70" y="66" fill="#FFFFFF" font-family="sans-serif" font-weight="bold" font-size="16">VISION IAS • CURRENT AFFAIRS MONTHLY DOSSIER</text>
      <text x="680" y="66" fill="#93C5FD" font-family="sans-serif" font-size="13" text-anchor="end">GS PAPER-2</text>
      
      <text x="50" y="120" fill="#0F172A" font-family="serif" font-weight="bold" font-size="20">1.1 Election Commission: Institutional Autonomy &amp; Reforms</text>
      
      <rect x="50" y="140" width="700" height="48" fill="#FEF08A" opacity="0.65" rx="3"/>
      <text x="60" y="170" fill="#0F172A" font-family="sans-serif" font-size="14" font-weight="600">"Article 324 vests superintendence, direction, and control of elections in the ECI."</text>
      
      <rect x="50" y="205" width="700" height="50" fill="#F3E8FF" stroke="#A855F7" stroke-width="1.5" stroke-dasharray="4" rx="6"/>
      <text x="65" y="235" fill="#6B21A8" font-family="sans-serif" font-size="13" font-weight="bold">✍️ Hand Note: Link with 2nd ARC 4th Report &amp; Dinesh Goswami Committee (1990)</text>
      
      <rect x="50" y="275" width="700" height="46" fill="#BBF7D0" opacity="0.65" rx="3"/>
      <text x="60" y="303" fill="#065F46" font-family="sans-serif" font-size="13.5" font-weight="600">"Expenditure of ECI should be charged on the Consolidated Fund of India."</text>
      
      <text x="60" y="360" fill="#0F172A" font-family="sans-serif" font-size="13.5">"Protection under Article 324(5) regarding removal only via impeachment for all Commissioners."</text>
      <line x1="60" y1="366" x2="680" y2="366" stroke="#F43F5E" stroke-width="3" stroke-linecap="round"/>
      
      <rect x="50" y="410" width="700" height="340" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="2" rx="8"/>
      <text x="400" y="445" fill="#1E293B" font-family="sans-serif" font-weight="bold" font-size="16" text-anchor="middle">Comparative Evolution of ECI Appointments</text>
      
      <rect x="80" y="475" width="180" height="150" fill="#FFFFFF" stroke="#E2E8F0" rx="6"/>
      <text x="170" y="505" fill="#334155" font-family="sans-serif" font-weight="bold" font-size="13" text-anchor="middle">Pre-2023</text>
      <text x="170" y="535" fill="#64748B" font-family="sans-serif" font-size="12" text-anchor="middle">President on Aid</text>
      <text x="170" y="555" fill="#64748B" font-family="sans-serif" font-size="12" text-anchor="middle">&amp; Advice of PM</text>
      <text x="170" y="585" fill="#EF4444" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Sole Executive Power</text>

      <rect x="310" y="475" width="180" height="150" fill="#EFF6FF" stroke="#3B82F6" stroke-width="2" rx="6"/>
      <text x="400" y="505" fill="#1D4ED8" font-family="sans-serif" font-weight="bold" font-size="13" text-anchor="middle">SC (Anoop Baranwal)</text>
      <text x="400" y="535" fill="#1E40AF" font-family="sans-serif" font-size="12" text-anchor="middle">1. Prime Minister</text>
      <text x="400" y="555" fill="#1E40AF" font-family="sans-serif" font-size="12" text-anchor="middle">2. Chief Justice (CJI)</text>
      <text x="400" y="575" fill="#1E40AF" font-family="sans-serif" font-size="12" text-anchor="middle">3. Leader of Opp. (LoP)</text>
      <text x="400" y="605" fill="#2563EB" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Judicial Safeguard</text>

      <rect x="540" y="475" width="180" height="150" fill="#F0FDF4" stroke="#10B981" rx="6"/>
      <text x="630" y="505" fill="#047857" font-family="sans-serif" font-weight="bold" font-size="13" text-anchor="middle">Act of 2023</text>
      <text x="630" y="535" fill="#065F46" font-family="sans-serif" font-size="12" text-anchor="middle">1. Prime Minister</text>
      <text x="630" y="555" fill="#065F46" font-family="sans-serif" font-size="12" text-anchor="middle">2. Union Minister</text>
      <text x="630" y="575" fill="#065F46" font-family="sans-serif" font-size="12" text-anchor="middle">3. Leader of Opp.</text>
      <text x="630" y="605" fill="#059669" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Executive Majority</text>

      <text x="400" y="680" fill="#475569" font-family="sans-serif" font-size="12" text-anchor="middle">Source: Constitution 324 &amp; Anoop Baranwal vs UOI (2023)</text>
      
      <line x1="50" y1="800" x2="750" y2="800" stroke="#E2E8F0"/>
      <text x="50" y="830" fill="#94A3B8" font-family="sans-serif" font-size="11">Vision IAS • October 2024 Edition • Page 1</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function generateSampleMapSvg() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380" width="640" height="380">
      <rect width="100%" height="100%" fill="#0F172A" rx="8"/>
      <text x="320" y="45" fill="#F8FAFC" font-family="sans-serif" font-weight="bold" font-size="17" text-anchor="middle">ECI Appointment Panel Comparison</text>
      
      <rect x="30" y="80" width="170" height="220" fill="#1E293B" stroke="#334155" rx="8"/>
      <text x="115" y="115" fill="#94A3B8" font-family="sans-serif" font-weight="bold" font-size="13" text-anchor="middle">Pre-2023 Mode</text>
      <text x="115" y="155" fill="#CBD5E1" font-family="sans-serif" font-size="12" text-anchor="middle">PM &amp; Cabinet</text>
      <text x="115" y="180" fill="#CBD5E1" font-family="sans-serif" font-size="12" text-anchor="middle">aid President</text>
      <rect x="45" y="240" width="140" height="32" fill="rgba(239, 68, 68, 0.2)" rx="6"/>
      <text x="115" y="261" fill="#F87171" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Executive Only</text>

      <rect x="235" y="80" width="170" height="220" fill="#1E293B" stroke="#3B82F6" stroke-width="2" rx="8"/>
      <text x="320" y="115" fill="#60A5FA" font-family="sans-serif" font-weight="bold" font-size="13" text-anchor="middle">SC 2023 Order</text>
      <text x="320" y="145" fill="#E2E8F0" font-family="sans-serif" font-size="12" text-anchor="middle">1. PM</text>
      <text x="320" y="170" fill="#E2E8F0" font-family="sans-serif" font-size="12" text-anchor="middle">2. CJI (Chief Justice)</text>
      <text x="320" y="195" fill="#E2E8F0" font-family="sans-serif" font-size="12" text-anchor="middle">3. LoP (Opp Leader)</text>
      <rect x="250" y="240" width="140" height="32" fill="rgba(59, 130, 246, 0.25)" rx="6"/>
      <text x="320" y="261" fill="#93C5FD" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Judicial Balance</text>

      <rect x="440" y="80" width="170" height="220" fill="#1E293B" stroke="#10B981" rx="8"/>
      <text x="525" y="115" fill="#34D399" font-family="sans-serif" font-weight="bold" font-size="13" text-anchor="middle">Parliament Act</text>
      <text x="525" y="145" fill="#E2E8F0" font-family="sans-serif" font-size="12" text-anchor="middle">1. PM</text>
      <text x="525" y="170" fill="#E2E8F0" font-family="sans-serif" font-size="12" text-anchor="middle">2. Cabinet Minister</text>
      <text x="525" y="195" fill="#E2E8F0" font-family="sans-serif" font-size="12" text-anchor="middle">3. LoP</text>
      <rect x="455" y="240" width="140" height="32" fill="rgba(16, 185, 129, 0.2)" rx="6"/>
      <text x="525" y="261" fill="#6EE7B7" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">2:1 Majority</text>

      <text x="320" y="340" fill="#64748B" font-family="sans-serif" font-size="11" text-anchor="middle">Cropped from Page 1 • Vision IAS GS-2 Editorial</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  window.canZoomPage = function(delta) {
    pageZoomScale = Math.min(2.5, Math.max(0.6, pageZoomScale + delta));
    applyPageZoom();
  };

  window.canResetPageZoom = function() {
    pageZoomScale = 1.0;
    applyPageZoom();
  };

  function applyPageZoom() {
    const stage = document.getElementById('canCanvasStage');
    const zoomText = document.getElementById('canZoomLevel');
    if (stage) {
      stage.style.transform = `scale(${pageZoomScale})`;
      stage.style.transformOrigin = 'top center';
    }
    if (zoomText) {
      zoomText.textContent = `${Math.round(pageZoomScale * 100)}%`;
    }
  }

  window.canPrevPage = function() {
    if (state.activePageIndex > 0) {
      window.canJumpToPage(state.activePageIndex - 1);
    }
  };

  window.canNextPage = function() {
    if (state.activePageIndex < state.pageRecords.length - 1) {
      window.canJumpToPage(state.activePageIndex + 1);
    }
  };

  window.canOpenExportModal = function() {
    openExportModal();
  };

  window.canCopyNoteText = function(itemKey) {
    const noteEl = document.getElementById(`note_${itemKey}`);
    const textEl = noteEl ? noteEl.querySelector('.can-note-text') : null;
    if (textEl && textEl.innerText) {
      navigator.clipboard.writeText(textEl.innerText.trim()).then(() => {
        showToast('📋 Note copied to clipboard!');
      }).catch(() => {
        showToast('Note copied!');
      });
    }
  };

  function updateMobileTabBadges() {
    let totalNotes = 0;
    state.pageRecords.forEach(p => {
      p.articles?.forEach(a => {
        totalNotes += (a.items?.length || 0);
      });
    });

    let totalMaps = 0;
    state.pageRecords.forEach(p => {
      totalMaps += (p.visualAssets?.length || 0);
    });

    const notesBadge = document.getElementById('canTabNotesBadge');
    if (notesBadge) notesBadge.textContent = String(totalNotes);

    const mapsBadge = document.getElementById('canTabMapsBadge');
    if (mapsBadge) mapsBadge.textContent = String(totalMaps);

    const pagerText = document.getElementById('canQuickPagerText');
    const quickPager = document.getElementById('canQuickPager');
    if (state.pageRecords.length > 0) {
      if (quickPager) quickPager.style.display = 'inline-flex';
      if (pagerText) pagerText.textContent = `Page ${state.activePageIndex + 1} of ${state.pageRecords.length}`;
    } else {
      if (quickPager) quickPager.style.display = 'none';
    }

    // Collapse dropzone if pages loaded
    updateActiveMagBar();
  }

  function renderActivePageCanvas() {
    const canvasWrap = document.getElementById('canCanvasViewport');
    const overlayLayer = document.getElementById('canOverlayLayer');
    if (!canvasWrap || !overlayLayer) return;

    const pageRecord = state.pageRecords[state.activePageIndex];
    if (!pageRecord || !pageRecord.imageBlobUrl) {
      canvasWrap.innerHTML = `
        <div style="text-align: center; color: var(--can-text-muted); font-size: 13px;">
          <div style="font-size: 28px; margin-bottom: 6px;">📄</div>
          <div>No page loaded yet. Drop a PDF above to begin.</div>
        </div>
      `;
      overlayLayer.innerHTML = '';
      return;
    }

    canvasWrap.innerHTML = `
      <div class="can-canvas-stage" id="canCanvasStage">
        <img src="${pageRecord.imageBlobUrl}" class="can-page-canvas" id="canActiveImg" alt="Page ${pageRecord.pageNum}">
        <div class="can-scan-sweeper" id="canScanSweeper"></div>
        <div class="can-overlay-layer" id="canOverlayLayer"></div>
      </div>
    `;
    applyPageZoom();
    renderAnnotationOverlays(pageRecord);
    updateMobileTabBadges();
  }

  // Render Overlays using Gemini box_2d: [ymin, xmin, ymax, xmax]
  function renderAnnotationOverlays(pageRecord) {
    const overlayLayer = document.getElementById('canOverlayLayer');
    if (!overlayLayer) return;
    overlayLayer.innerHTML = '';

    if (!pageRecord.articles) return;

    pageRecord.articles.forEach((art, artIdx) => {
      art.items.forEach((item, itemIdx) => {
        if (!item.box_2d || item.box_2d.length !== 4) return;
        const [ymin, xmin, ymax, xmax] = item.box_2d;
        const marker = document.createElement('div');
        const itemKey = `p${pageRecord.pageNum}_a${artIdx}_i${itemIdx}`;
        marker.id = `box_${itemKey}`;
        marker.className = `can-box-marker can-box-${item.type || 'highlight'}`;
        marker.style.left = `${(xmin / 10).toFixed(1)}%`;
        marker.style.top = `${(ymin / 10).toFixed(1)}%`;
        marker.style.width = `${((xmax - xmin) / 10).toFixed(1)}%`;
        marker.style.height = `${((ymax - ymin) / 10).toFixed(1)}%`;
        marker.title = `${item.type.toUpperCase()}: ${item.text.slice(0, 60)}...`;

        marker.addEventListener('mouseenter', () => spotlightItem(itemKey, true));
        marker.addEventListener('mouseleave', () => spotlightItem(null, false));
        marker.addEventListener('click', () => {
          spotlightItem(itemKey, true);
          scrollToNoteItem(itemKey);
        });

        overlayLayer.appendChild(marker);
      });
    });
  }

  function spotlightItem(itemKey, activate) {
    state.spotlightItemKey = activate ? itemKey : null;

    document.querySelectorAll('.can-box-marker').forEach(b => b.classList.remove('can-spotlight-active'));
    document.querySelectorAll('.can-note-item').forEach(n => n.classList.remove('can-spotlight-active'));

    if (activate && itemKey) {
      const box = document.getElementById(`box_${itemKey}`);
      const note = document.getElementById(`note_${itemKey}`);
      if (box) box.classList.add('can-spotlight-active');
      if (note) note.classList.add('can-spotlight-active');
    }
  }

  function scrollToNoteItem(itemKey) {
    if (window.innerWidth <= 900) {
      switchMobileTab('notes');
    }
    setTimeout(() => {
      const note = document.getElementById(`note_${itemKey}`);
      if (note) {
        note.scrollIntoView({ behavior: 'smooth', block: 'center' });
        note.classList.add('can-spotlight-active');
      }
    }, 60);
  }

  window.canFocusPageItem = function (itemKey) {
    if (window.innerWidth <= 900) {
      switchMobileTab('page');
    }
    spotlightItem(itemKey, true);
    setTimeout(() => {
      const box = document.getElementById(`box_${itemKey}`);
      if (box) {
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        box.classList.add('can-spotlight-active');
      }
    }, 100);
  };

  // Render Right Notes Panel
  function renderNotesPanel() {
    const container = document.getElementById('canNotesContainer');
    if (!container) return;

    if (state.viewMode === 'flashcard') {
      renderFlashcardView(container);
      return;
    }
    if (state.viewMode === 'mindmap') {
      renderMindMapView(container);
      return;
    }

    renderNotebookView(container);
    updateMobileTabBadges();
  }

  function renderNotebookView(container) {
    const allArticles = compileAllArticles();

    if (allArticles.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 48px 16px; color: var(--can-text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">🖋️</div>
          <div style="font-family: var(--can-font-serif); font-size: 17px; font-weight: 800; color: var(--can-text-primary); margin-bottom: 4px;">The Desk is Quiet</div>
          <div style="font-size: 13.5px;">Marked highlights, handwritten margin notes, and maps will assemble here as each page is scanned.</div>
        </div>
      `;
      return;
    }

    let html = `<div class="can-notebook-view">`;

    allArticles.forEach(secGroup => {
      html += `
        <div class="can-section-group">
          <span class="can-section-badge">${secGroup.section}</span>
      `;

      secGroup.articles.forEach(art => {
        html += `
          <div style="margin-bottom: 18px;">
            <div class="can-article-heading">
              <span>${escapeHtml(art.heading)}</span>
              <span style="font-size: 11px; font-family: var(--can-font-mono); color: var(--can-text-muted);">p. ${art.pages.join(', ')}</span>
            </div>

            <!-- Auto-generated Key Takeaway & Quick Revision Points -->
            <div class="can-ai-summary-box">
              <div class="can-summary-tag">✨ AI Key Takeaway</div>
              <div style="font-weight: 700; color: var(--can-text-primary); margin-bottom: 6px;">${escapeHtml(art.takeaway)}</div>
              <ul style="margin: 0; padding-left: 18px; color: var(--can-text-secondary); line-height: 1.45;">
                ${art.revisionPoints.map(pt => `<li>${escapeHtml(pt)}</li>`).join('')}
              </ul>
            </div>

            <div class="can-items-list">
        `;

        art.items.forEach(item => {
          if (state.colorFilter !== 'ALL' && item.color !== state.colorFilter) return;
          if (state.typeFilter !== 'ALL' && item.type !== state.typeFilter) return;

          const itemKey = item.itemKey;
          const isLowConfidence = item.confidence && item.confidence < 0.85;

          html += `
            <div class="can-note-item can-color-${item.color || 'yellow'}" id="note_${itemKey}" data-key="${itemKey}">
              <div class="can-item-meta-strip">
                <span class="can-item-type-pill can-pill-${item.color || 'yellow'}">
                  ${item.type}
                </span>
                <span style="display:flex; align-items:center; gap:6px;">
                  ${isLowConfidence ? `<span style="font-size:10px; font-weight:800; color:#DC2626; background:rgba(239,68,68,0.12); padding:2px 6px; border-radius:4px;">Needs Review</span>` : ''}
                  <span style="font-family: var(--can-font-mono);">Page ${item.pageNum}</span>
                </span>
              </div>
              <div class="can-note-text" contenteditable="true" title="Click to edit text inline">${escapeHtml(item.text)}</div>
              ${item.note_attached_to ? `<div style="font-size: 11.5px; font-style: italic; color: var(--can-accent);">Attached to: ${escapeHtml(item.note_attached_to)}</div>` : ''}
              <div class="can-note-actions">
                <button class="can-item-btn" onclick="window.canFocusPageItem('${itemKey}')">🔍 View on page</button>
                <button class="can-item-btn" onclick="window.canCopyNoteText('${itemKey}')">📋 Copy</button>
                <button class="can-item-btn" onclick="window.canDeleteNoteItem('${itemKey}')">Delete</button>
              </div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });

      html += `</div>`;
    });

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll('.can-note-text').forEach(el => {
      el.addEventListener('blur', () => {
        const itemKey = el.closest('.can-note-item')?.getAttribute('data-key');
        if (itemKey) updateItemText(itemKey, el.innerText.trim());
      });
    });

    container.querySelectorAll('.can-note-item').forEach(el => {
      const key = el.getAttribute('data-key');
      el.addEventListener('mouseenter', () => spotlightItem(key, true));
      el.addEventListener('mouseleave', () => spotlightItem(null, false));
    });
  }

  // Compile Articles, Merge Consecutive Pages & Remove Duplicates
  function compileAllArticles() {
    const sectionMap = {};

    state.pageRecords.forEach(page => {
      if (!page.articles) return;

      page.articles.forEach((art, artIdx) => {
        const sec = art.section || 'General';
        if (!sectionMap[sec]) sectionMap[sec] = {};

        const heading = art.heading || 'Key Notes';
        if (!sectionMap[sec][heading]) {
          sectionMap[sec][heading] = {
            heading,
            section: sec,
            pages: new Set(),
            items: [],
            pageTakeaways: []
          };
        }

        sectionMap[sec][heading].pages.add(page.pageNum);
        if (page.takeaway) sectionMap[sec][heading].pageTakeaways.push(page.takeaway);

        art.items.forEach((item, itemIdx) => {
          const itemKey = `p${page.pageNum}_a${artIdx}_i${itemIdx}`;

          // Duplicate check: Same text both highlighted & underlined keeps both marker types
          const existingItem = sectionMap[sec][heading].items.find(x => x.text === item.text);
          if (existingItem) {
            if (!existingItem.type.includes(item.type)) {
              existingItem.type = `${existingItem.type} + ${item.type}`;
            }
          } else {
            sectionMap[sec][heading].items.push({
              ...item,
              itemKey,
              pageNum: page.pageNum
            });
          }
        });
      });
    });

    const result = [];
    for (const sec in sectionMap) {
      const articles = [];
      for (const h in sectionMap[sec]) {
        const artObj = sectionMap[sec][h];
        artObj.pages = Array.from(artObj.pages).sort((a, b) => a - b);

        artObj.takeaway = artObj.pageTakeaways.length > 0
          ? artObj.pageTakeaways[0]
          : `Core takeaways for ${h}: Critical factual and analytical dimensions highlighted for revision.`;
        
        artObj.revisionPoints = artObj.items.slice(0, 4).map(it => it.text.slice(0, 95) + (it.text.length > 95 ? '...' : ''));
        if (artObj.revisionPoints.length === 0) {
          artObj.revisionPoints = ['Review annotated margins and highlighted provisions prior to exam.'];
        }

        articles.push(artObj);
      }
      result.push({ section: sec, articles });
    }

    return result;
  }

  function updateItemText(itemKey, newText) {
    state.pageRecords.forEach(page => {
      if (!page.articles) return;
      page.articles.forEach((art, aIdx) => {
        art.items.forEach((item, iIdx) => {
          if (`p${page.pageNum}_a${aIdx}_i${iIdx}` === itemKey) {
            item.text = newText;
            saveDbRecord('pages', page);
          }
        });
      });
    });
  }

  window.canDeleteNoteItem = function (itemKey) {
    state.pageRecords.forEach(page => {
      if (!page.articles) return;
      page.articles.forEach((art, aIdx) => {
        art.items = art.items.filter((item, iIdx) => `p${page.pageNum}_a${aIdx}_i${iIdx}` !== itemKey);
      });
      saveDbRecord('pages', page);
    });
    renderNotesPanel();
    renderActivePageCanvas();
  };

  // Mode 2: Flashcard View
  function renderFlashcardView(container) {
    const allItems = [];
    state.pageRecords.forEach(p => {
      p.articles?.forEach(a => {
        a.items?.forEach(it => allItems.push({ ...it, section: a.section, heading: a.heading, pageNum: p.pageNum }));
      });
    });

    if (allItems.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--can-text-muted);">No flashcards available yet. Process pages first.</div>`;
      return;
    }

    if (state.flashcardIndex >= allItems.length) state.flashcardIndex = 0;
    const card = allItems[state.flashcardIndex];

    container.innerHTML = `
      <div class="can-flashcard-view">
        <div style="font-size: 13px; font-weight: 700; color: var(--can-text-muted);">
          Card ${state.flashcardIndex + 1} of ${allItems.length} • Click card to flip
        </div>
        <div class="can-flashcard-stage" id="canFcStage" onclick="this.classList.toggle('can-flipped')">
          <div class="can-flashcard-inner">
            <div class="can-flashcard-front">
              <div>
                <span class="can-section-badge">${card.section || 'General'}</span>
                <div style="font-family: var(--can-font-serif); font-size: 18px; font-weight: 800; margin-top: 10px;">${escapeHtml(card.heading)}</div>
              </div>
              <div style="font-size: 15px; line-height: 1.6; color: var(--can-text-primary);">
                "${escapeHtml(card.text)}"
              </div>
              <div style="font-size: 11px; color: var(--can-text-muted);">Tap to reveal context &amp; details &rarr;</div>
            </div>
            <div class="can-flashcard-back">
              <div>
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--can-emerald);">Exam Context</span>
                <div style="font-size: 14px; font-weight: 700; margin-top: 6px;">Page ${card.pageNum} • Type: ${card.type.toUpperCase()}</div>
              </div>
              <div style="font-size: 13.5px; line-height: 1.5; color: var(--can-text-secondary);">
                ${card.note_attached_to ? `<strong>Annotation note:</strong> ${escapeHtml(card.note_attached_to)}<br>` : ''}
                High-yield revision concept extracted from ${escapeHtml(state.magazineMeta.title)}.
              </div>
              <div style="font-size: 11px; color: var(--can-text-muted);">Tap to return &larr;</div>
            </div>
          </div>
        </div>
        <div class="can-fc-nav">
          <button class="can-btn-secondary" onclick="window.canPrevFlashcard()">&larr; Previous</button>
          <button class="can-btn-primary" onclick="window.canNextFlashcard()">Next Card &rarr;</button>
        </div>
      </div>
    `;
  }

  window.canPrevFlashcard = function () {
    if (state.flashcardIndex > 0) state.flashcardIndex--;
    renderNotesPanel();
  };

  window.canNextFlashcard = function () {
    state.flashcardIndex++;
    renderNotesPanel();
  };

  // Mode 3: Mind-Map View
  function renderMindMapView(container) {
    const allArticles = compileAllArticles();
    if (allArticles.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--can-text-muted);">Process pages to generate interactive mind map.</div>`;
      return;
    }

    let html = `
      <div class="can-mindmap-view">
        <div class="can-mm-root-node">📖 ${escapeHtml(state.magazineMeta.title)}</div>
        <div class="can-mm-branches">
    `;

    allArticles.forEach(sec => {
      html += `
        <div class="can-mm-branch-node">
          <div style="font-weight: 800; color: var(--can-primary); margin-bottom: 8px;">🏛️ ${sec.section}</div>
          <div style="display: flex; flex-direction: column; gap: 8px; padding-left: 14px;">
      `;

      sec.articles.forEach(art => {
        html += `
          <div style="background: var(--can-bg-subtle); padding: 8px 12px; border-radius: 6px; font-size: 13px;">
            <strong>${escapeHtml(art.heading)}</strong> (${art.items.length} marked points)
          </div>
        `;
      });

      html += `</div></div>`;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  }

  // Map Gallery
  function renderMapGallery() {
    const grid = document.getElementById('canMapGalleryGrid');
    if (!grid) return;

    const allVisuals = [];
    state.pageRecords.forEach(p => {
      p.visualAssets?.forEach(v => {
        if (v.croppedImageUrl) allVisuals.push({ ...v, pageNum: p.pageNum });
      });
    });

    if (allVisuals.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--can-text-muted); padding: 20px;">No maps or diagrams marked in this document.</div>`;
      return;
    }

    grid.innerHTML = allVisuals.map(vis => `
      <div class="can-map-card">
        <img src="${vis.croppedImageUrl}" class="can-map-img" onclick="window.canZoomMap('${vis.croppedImageUrl}', '${escapeHtml(vis.caption)}')" alt="Extracted Map">
        <div class="can-map-body">
          <div class="can-map-caption">${escapeHtml(vis.caption)}</div>
          <div class="can-map-labels">
            ${(vis.labels || []).map(l => `<span class="can-map-label-tag">${escapeHtml(l)}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }

  window.canZoomMap = function (imgSrc, caption) {
    const modal = document.getElementById('canLightboxModal');
    const imgEl = document.getElementById('canLightboxImg');
    const capEl = document.getElementById('canLightboxCaption');
    if (modal && imgEl) {
      imgEl.src = imgSrc;
      if (capEl) capEl.textContent = caption;
      modal.classList.add('can-modal-open');
    }
  };

  // Timeline Ribbon
  function renderTimelineRibbon() {
    const ribbon = document.getElementById('canRibbonScroll');
    const pctLabel = document.getElementById('canRibbonPct');
    if (!ribbon) return;

    const total = state.pageRecords.length;
    const completed = state.pageRecords.filter(p => p.status === 'done' || p.status === 'no-marks').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (pctLabel) pctLabel.textContent = `${pct}% Complete (${completed}/${total} pgs)`;

    ribbon.innerHTML = state.pageRecords.map((page, idx) => `
      <div class="can-page-thumb-cell ${idx === state.activePageIndex ? 'can-thumb-active' : ''}" onclick="window.canJumpToPage(${idx})">
        <span style="font-size: 11px; font-weight: 800; font-family: var(--can-font-mono);">${page.pageNum}</span>
        <span class="can-thumb-badge can-state-${page.status}">
          ${page.status === 'done' ? '✓' : (page.status === 'scanning' ? '⚡' : (page.status === 'no-marks' ? '—' : page.status))}
        </span>
      </div>
    `).join('');
  }

  window.canJumpToPage = function (index) {
    if (index >= 0 && index < state.pageRecords.length) {
      state.activePageIndex = index;
      renderTimelineRibbon();
      renderActivePageCanvas();
    }
  };

  function updateScanSweeper(active, statusText = '') {
    const sweeper = document.getElementById('canScanSweeper');
    if (sweeper) {
      if (active) sweeper.classList.add('can-scanning');
      else sweeper.classList.remove('can-scanning');
    }
    if (statusText) showToast(statusText);
  }

  function triggerInkDropAnimation() {
    const canvasWrap = document.getElementById('canCanvasViewport');
    if (!canvasWrap) return;

    for (let k = 0; k < 3; k++) {
      const drop = document.createElement('div');
      drop.className = 'can-ink-drop';
      drop.style.background = ['#FEF08A', '#86EFAC', '#F472B6'][k % 3];
      drop.style.left = '50%';
      drop.style.top = `${30 + k * 20}%`;
      canvasWrap.appendChild(drop);

      setTimeout(() => {
        drop.style.opacity = '1';
        drop.style.transform = `translate(${180 + k * 30}px, ${-60 + k * 40}px) scale(1.4)`;
      }, 50);

      setTimeout(() => drop.remove(), 700);
    }
  }

  function togglePauseProcessing() {
    state.isPaused = true;
    updateControlsUI();
    showToast('Extraction paused.');
  }

  function resumeProcessing() {
    state.isPaused = false;
    updateControlsUI();
    showToast('Resuming extraction...');
  }

  function cancelProcessing() {
    state.isCancelled = true;
    state.isProcessing = false;
    updateControlsUI();
    showToast('Extraction cancelled.');
  }

  async function rescanCurrentPage() {
    const current = state.pageRecords[state.activePageIndex];
    if (!current) return;
    current.status = 'queued';
    renderTimelineRibbon();
    showToast(`Re-scanning page ${current.pageNum}...`);
    startSequentialProcessing();
  }

  function updateControlsUI() {
    const pauseBtn = document.getElementById('canPauseBtn');
    const resumeBtn = document.getElementById('canResumeBtn');
    const cancelBtn = document.getElementById('canCancelBtn');

    if (pauseBtn) pauseBtn.style.display = state.isProcessing && !state.isPaused ? 'inline-flex' : 'none';
    if (resumeBtn) resumeBtn.style.display = state.isProcessing && state.isPaused ? 'inline-flex' : 'none';
    if (cancelBtn) cancelBtn.style.display = state.isProcessing ? 'inline-flex' : 'none';
  }

  function switchViewMode(mode) {
    state.viewMode = mode;
    document.querySelectorAll('.can-mode-btn').forEach(btn => {
      btn.classList.toggle('can-active', btn.getAttribute('data-mode') === mode);
    });
    renderNotesPanel();
  }

  function switchMobileTab(tab, shouldScroll = true) {
    state.mobileTab = tab;
    document.querySelectorAll('.can-m-tab-btn').forEach(btn => {
      btn.classList.toggle('can-active', btn.getAttribute('data-tab') === tab);
    });

    const pageCol = document.getElementById('canPageCol');
    const notesCol = document.getElementById('canNotesCol');
    const mapsSection = document.getElementById('canMapsSection');

    if (pageCol) pageCol.classList.toggle('can-tab-hidden', tab !== 'page');
    if (notesCol) notesCol.classList.toggle('can-tab-hidden', tab !== 'notes');
    if (mapsSection) mapsSection.classList.toggle('can-tab-hidden', tab !== 'maps');

    if (shouldScroll && window.innerWidth <= 900) {
      const activeEl = tab === 'page' ? pageCol : (tab === 'notes' ? notesCol : mapsSection);
      if (activeEl) {
        const topOffset = activeEl.getBoundingClientRect().top + window.pageYOffset - 110;
        window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
      }
    }
  }

  function openExportModal() {
    const modal = document.getElementById('canExportModal');
    if (modal) modal.classList.add('can-modal-open');
  }

  window.canCloseModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('can-modal-open');
  };

  // Selectable PDF Generation - Well-Formatted 2-Column UPSC Editorial Format (<= 1/4th Page Budget)
  window.canExportPdf = async function (type) {
    showToast('Generating compact 1/4th revision PDF...');
    try {
      const jspdfModule = await ensureJsPdf();
      const { jsPDF } = jspdfModule;
      const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

      const allArticles = compileAllArticles();
      const pageWidth = doc.internal.pageSize.getWidth();   // 595.28 pt
      const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt

      // Original page count and strict 1/4th page target budget
      const originalPages = state.totalPages || (state.pageRecords ? state.pageRecords.length : 1) || 1;
      const targetMaxPages = Math.max(1, Math.ceil(originalPages / 4));

      // Robust sanitizer: removes full-width Unicode, smart quotes, rupee symbol, OCR artifacts, and highlighter tags
      function cleanNoteText(str) {
        if (!str) return '';
        return str
          .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
          .replace(/₹/g, 'Rs. ')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2013\u2014]/g, ' - ')
          .replace(/!\s*'/g, ': ')
          .replace(/\s+/g, ' ')
          .replace(/^\[(?:HIGHLIGHT|UNDERLINE|BOXED|HANDWRITTEN|NOTE|MARGIN_NOTE|HIGHLIGHTED|UNDERLINED)[^\]]*\]\s*/i, '')
          .replace(/^(?:highlight|underline|boxed|handwritten|margin_note|highlighted|underlined|note):\s*/i, '')
          .trim();
      }

      // 2-Column Editorial Dimensions
      const marginLeft = 32;
      const marginRight = 32;
      const marginTop = 34;
      const marginBottom = 28;
      const gutter = 16;
      const contentWidth = pageWidth - marginLeft - marginRight; // 531.28 pt
      const colWidth = (contentWidth - gutter) / 2;               // 257.64 pt
      const colHeight = pageHeight - marginTop - marginBottom;    // 779.89 pt
      const bottomLimit = pageHeight - marginBottom;

      // Color mapping for highlights
      const colorMap = {
        yellow: [234, 179, 8],
        green: [34, 197, 94],
        pink: [236, 72, 153],
        blue: [14, 165, 233],
        purple: [168, 85, 247],
        default: [37, 99, 235]
      };

      // Measure total volume to dynamically pick density tier
      let totalItemCount = 0;
      let totalCharCount = 0;
      allArticles.forEach(sec => {
        sec.articles.forEach(art => {
          totalItemCount += (art.items ? art.items.length : 0);
          art.items?.forEach(it => {
            totalCharCount += (it.text ? it.text.length : 0);
          });
        });
      });

      // Target capacity check to guarantee <= targetMaxPages
      let densityTier = 'standard';
      const availableLinesStandard = targetMaxPages * 2 * (colHeight / 10.2);
      const estimatedLines = (totalCharCount / 48) + (totalItemCount * 1.5);

      if (estimatedLines > availableLinesStandard * 1.05) {
        densityTier = 'compact';
      }
      if (estimatedLines > availableLinesStandard * 1.4) {
        densityTier = 'dense';
      }

      // Typographic configuration per tier
      const typo = {
        standard: {
          bodySize: 8.0,
          bodyLineH: 9.8,
          handwrittenSize: 6.5,     // Noticeably reduced as requested
          handwrittenLineH: 8.2,
          takeawaySize: 6.8,
          takeawayLineH: 8.5,
          headingSize: 8.5,
          sectionSize: 8.0,
          itemSpacing: 3.5,
          artSpacing: 6.5,
          secSpacing: 9.0
        },
        compact: {
          bodySize: 7.4,
          bodyLineH: 9.0,
          handwrittenSize: 6.0,     // Reduced
          handwrittenLineH: 7.5,
          takeawaySize: 6.4,
          takeawayLineH: 7.8,
          headingSize: 8.0,
          sectionSize: 7.5,
          itemSpacing: 2.8,
          artSpacing: 5.0,
          secSpacing: 7.5
        },
        dense: {
          bodySize: 6.8,
          bodyLineH: 8.2,
          handwrittenSize: 5.5,     // Reduced
          handwrittenLineH: 6.8,
          takeawaySize: 5.8,
          takeawayLineH: 7.2,
          headingSize: 7.5,
          sectionSize: 7.0,
          itemSpacing: 2.2,
          artSpacing: 4.0,
          secSpacing: 6.0
        }
      }[densityTier];

      // Layout Cursor State
      let currentPage = 1;
      let currentCol = 0; // 0 = left, 1 = right
      let y = marginTop;

      // Page 1 Header Banner (Dossier Title & Condensation Statistics)
      function drawPage1Header() {
        doc.setFillColor(37, 99, 235);
        doc.rect(marginLeft, y, contentWidth, 3, 'F');
        y += 11;

        // Magazine Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        const titleText = state.magazineMeta.title || 'Current Affairs Magazine Revision Notes';
        const titleLines = doc.splitTextToSize(titleText, contentWidth - 145);
        doc.text(titleLines, marginLeft, y);

        // 1/4th Condensation Ratio Badge on Right
        const badgeW = 135;
        const badgeH = 22;
        const badgeX = pageWidth - marginRight - badgeW;
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(191, 219, 254);
        doc.roundedRect(badgeX, y - 9, badgeW, badgeH, 3, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(29, 78, 216);
        doc.text('1/4th Page Condensation', badgeX + (badgeW / 2), y + 1, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`${originalPages} pgs original -> ${targetMaxPages} pgs max`, badgeX + (badgeW / 2), y + 9.5, { align: 'center' });

        y += Math.max(titleLines.length * 12, 14);

        // Sub-bar metadata
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(37, 99, 235);
        doc.text('UPSC CSE HIGH-YIELD REVISION DOSSIER', marginLeft, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        doc.text(`Compiled: ${dateStr}  |  Editorial 2-Column Digest`, pageWidth - marginRight, y, { align: 'right' });
        y += 8;

        // Divider rule
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.65);
        doc.line(marginLeft, y, pageWidth - marginRight, y);
        y += 12;

        return y;
      }

      // Draw header on Page 1
      const page1ContentTop = drawPage1Header();
      y = page1ContentTop;

      function getColX() {
        return currentCol === 0 ? marginLeft : marginLeft + colWidth + gutter;
      }

      function ensureSpace(neededHeight) {
        if (y + neededHeight > bottomLimit) {
          if (currentCol === 0) {
            currentCol = 1;
            y = currentPage === 1 ? page1ContentTop : marginTop;
          } else {
            if (currentPage < targetMaxPages) {
              doc.addPage();
              currentPage++;
              currentCol = 0;
              y = marginTop;
            } else {
              // At max budget page, pack remaining space tightly without exceeding targetMaxPages
              currentCol = 1;
              y = Math.min(y, bottomLimit - neededHeight);
            }
          }
        }
      }

      function drawColumnDivider(pg) {
        doc.setPage(pg);
        const dividerX = marginLeft + colWidth + (gutter / 2);
        const topY = pg === 1 ? page1ContentTop : marginTop;
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(dividerX, topY, dividerX, bottomLimit);
      }

      // --- RENDER CONTENT ---
      allArticles.forEach((secGroup) => {
        if (type !== 'all' && secGroup.section.toLowerCase() !== type.toLowerCase()) return;

        // SECTION HEADER BANNER (e.g. POLITY, ECONOMY)
        ensureSpace(24);
        const colX = getColX();

        doc.setFillColor(241, 245, 249);
        doc.roundedRect(colX, y, colWidth, 14, 2, 2, 'F');
        doc.setFillColor(37, 99, 235);
        doc.rect(colX, y, 3, 14, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(typo.sectionSize);
        doc.setTextColor(30, 41, 59);
        doc.text(secGroup.section.toUpperCase(), colX + 7, y + 9.5);
        y += 18;

        secGroup.articles.forEach((art) => {
          ensureSpace(32);
          const aX = getColX();

          // Article Heading
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(typo.headingSize);
          doc.setTextColor(15, 23, 42);
          const headingLines = doc.splitTextToSize(art.heading, colWidth - 32);
          doc.text(headingLines, aX, y);

          // Page reference tag
          if (art.pages && art.pages.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`p. ${art.pages.join(', ')}`, aX + colWidth, y, { align: 'right' });
          }
          y += (headingLines.length * (typo.headingSize + 1.5)) + 3;

          // AI Core Takeaway (Compact callout box)
          if (art.takeaway && art.takeaway.trim().length > 5) {
            const takeawayText = cleanNoteText(art.takeaway);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(typo.takeawaySize);
            const takeawayLines = doc.splitTextToSize(takeawayText, colWidth - 12);
            const boxH = (takeawayLines.length * typo.takeawayLineH) + 9;

            ensureSpace(boxH + 4);
            const tX = getColX();

            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(tX, y, colWidth, boxH, 2, 2, 'FD');

            doc.setFillColor(16, 185, 129);
            doc.rect(tX, y, 2.5, boxH, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(5, 150, 105);
            doc.text('KEY TAKEAWAY', tX + 6, y + 6.5);

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(typo.takeawaySize);
            doc.setTextColor(51, 65, 85);
            doc.text(takeawayLines, tX + 6, y + 14);
            y += boxH + 4;
          }

          // EXTRACTED ITEMS (Highlights & Reduced-Size Handwritten Notes)
          art.items.forEach((it) => {
            const rawClean = cleanNoteText(it.text);
            if (!rawClean) return;

            // Accurate handwritten identification
            const isHandwritten = it.type === 'handwritten' || 
                                  it.type === 'margin_note' || 
                                  (it.text && it.text.includes('✍️'));

            const cColor = colorMap[it.color] || colorMap.default;

            if (isHandwritten) {
              // --- HANDWRITTEN MARGIN NOTE: REDUCED SIZE AS REQUESTED ---
              const prefixW = 26;
              const textW = colWidth - prefixW;

              doc.setFont('helvetica', 'italic');
              doc.setFontSize(typo.handwrittenSize);
              const noteLines = doc.splitTextToSize(rawClean, textW);

              for (let lineIdx = 0; lineIdx < noteLines.length; lineIdx++) {
                ensureSpace(typo.handwrittenLineH);
                const curX = getColX();

                if (lineIdx === 0) {
                  // Sleek compact [NOTE] badge in 5pt font
                  doc.setFillColor(243, 232, 255);
                  doc.setDrawColor(216, 180, 254);
                  doc.roundedRect(curX, y - 6, 22, 7.5, 1.5, 1.5, 'FD');
                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(5.0);
                  doc.setTextColor(126, 34, 206);
                  doc.text('NOTE', curX + 3.5, y - 0.5);
                }

                // Handwritten note body text in reduced size
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(typo.handwrittenSize);
                doc.setTextColor(71, 85, 105);
                doc.text(noteLines[lineIdx], curX + prefixW, y);
                y += typo.handwrittenLineH;
              }
              y += typo.itemSpacing * 0.7;

            } else {
              // --- STANDARD HIGHLIGHT ITEM ---
              const prefixW = 9;
              const textW = colWidth - prefixW;

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(typo.bodySize);
              const noteLines = doc.splitTextToSize(rawClean, textW);

              for (let lineIdx = 0; lineIdx < noteLines.length; lineIdx++) {
                ensureSpace(typo.bodyLineH);
                const curX = getColX();

                if (lineIdx === 0) {
                  // Color-coded circle bullet matching neon highlighter
                  doc.setFillColor(cColor[0], cColor[1], cColor[2]);
                  doc.circle(curX + 3, y - 2.5, 1.6, 'F');
                }

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(typo.bodySize);
                doc.setTextColor(30, 41, 59);
                doc.text(noteLines[lineIdx], curX + prefixW, y);
                y += typo.bodyLineH;
              }
              y += typo.itemSpacing;
            }
          });

          y += typo.artSpacing;
        });

        y += typo.secSpacing;
      });

      // Draw vertical column divider on each page
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        drawColumnDivider(p);
      }

      // --- RUNNING HEADER & FOOTER ON ALL PAGES ---
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Header on Pages 2+
        if (i > 1) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(148, 163, 184);
          doc.text(`${state.magazineMeta.title || 'Current Affairs Notes'} • UPSC Revision Dossier`, marginLeft, 22);
          doc.text('The Ink Lab', pageWidth - marginRight, 22, { align: 'right' });
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.5);
          doc.line(marginLeft, 25, pageWidth - marginRight, 25);
        }

        // Footer on all pages
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(marginLeft, pageHeight - 20, pageWidth - marginRight, pageHeight - 20);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Extracted with The Ink Lab (Google Gemini Vision)', marginLeft, pageHeight - 11);

        const reductionPct = Math.round((1 - (totalPages / originalPages)) * 100);
        const condStr = `Original: ${originalPages} pgs -> Revision: ${totalPages} pgs (${Math.max(0, reductionPct)}% reduction)`;
        doc.text(`${condStr}  |  Page ${i} of ${totalPages}`, pageWidth - marginRight, pageHeight - 11, { align: 'right' });
      }

      const filename = `${(state.magazineMeta.title || 'Current_Affairs').replace(/[^a-zA-Z0-9_-]/g, '_')}_1-4th_Revision_Notes.pdf`;
      doc.save(filename);
      showToast(`PDF downloaded: ${totalPages} pages (within 1/4th page budget)!`);
      window.canCloseModal('canExportModal');
    } catch (err) {
      console.error('[PDF Gen Error]', err);
      showToast('Failed to generate PDF. Check console.');
    }
  };

  window.canExportMarkdown = function () {
    const allArticles = compileAllArticles();
    let md = `# ${state.magazineMeta.title || 'Current Affairs Notes'}\n\n`;
    md += `*Extracted with The Ink Lab (Google Gemini Vision) — ${new Date().toLocaleDateString()}*\n\n`;

    allArticles.forEach(sec => {
      md += `## ${sec.section.toUpperCase()}\n\n`;
      sec.articles.forEach(art => {
        md += `### ${art.heading} (p. ${art.pages.join(', ')})\n\n`;
        if (art.takeaway) {
          md += `> **Key Takeaway:** ${art.takeaway}\n\n`;
        }
        art.items.forEach(it => {
          const clean = (it.text || '')
            .replace(/^\[(?:HIGHLIGHT|UNDERLINE|BOXED|HIGHLIGHTED|UNDERLINED)[^\]]*\]\s*/i, '')
            .replace(/^(?:highlight|underline|boxed|highlighted|underlined):\s*/i, '')
            .trim();
          const prefix = it.type === 'handwritten' ? '*(Handwritten Note)* ' : '';
          md += `- ${prefix}${clean}\n`;
        });
        md += `\n`;
      });
    });

    downloadBlob(md, `${(state.magazineMeta.title || 'CA_Notes').replace(/\s+/g, '_')}.md`, 'text/markdown');
  };

  window.canCopyAllText = function () {
    const allArticles = compileAllArticles();
    let text = `${state.magazineMeta.title || 'Current Affairs Notes'}\n\n`;
    allArticles.forEach(sec => {
      text += `=== ${sec.section.toUpperCase()} ===\n`;
      sec.articles.forEach(art => {
        text += `\n[${art.heading}] (p. ${art.pages.join(', ')})\n`;
        if (art.takeaway) {
          text += `Takeaway: ${art.takeaway}\n`;
        }
        art.items.forEach(it => {
          const clean = (it.text || '')
            .replace(/^\[(?:HIGHLIGHT|UNDERLINE|BOXED|HIGHLIGHTED|UNDERLINED)[^\]]*\]\s*/i, '')
            .replace(/^(?:highlight|underline|boxed|highlighted|underlined):\s*/i, '')
            .trim();
          const prefix = it.type === 'handwritten' ? '[Note] ' : '• ';
          text += `${prefix}${clean}\n`;
        });
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      showToast('All extracted notes copied to clipboard!');
    });
  };

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function confirmClearData() {
    if (confirm('Clear all extracted magazine data from your browser? This will purge local IndexedDB storage.')) {
      await clearDatabase();
      state.pageRecords = [];
      state.totalPages = 0;
      state.activePageIndex = 0;
      renderTimelineRibbon();
      renderActivePageCanvas();
      renderNotesPanel();
      renderMapGallery();
      showToast('All local magazine notes cleared.');
    }
  }

  function showToast(msg) {
    let toast = document.getElementById('canToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'canToast';
      toast.style.cssText = 'position:fixed; bottom:24px; right:24px; background:#0F172A; color:#FFF; padding:10px 18px; border-radius:8px; font-size:13px; font-weight:700; z-index:99999; box-shadow:0 6px 20px rgba(0,0,0,0.25); transition:opacity 0.2s ease;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3200);
  }

  function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.className = 'can-confetti-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#FEF08A', '#86EFAC', '#F472B6', '#38BDF8', '#C084FC'];
    for (let i = 0; i < 70; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 12 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 3 + 2,
        vx: (Math.random() - 0.5) * 2,
        rot: Math.random() * 360
      });
    }

    let frames = 0;
    function anim() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += 2;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      frames++;
      if (frames < 180) requestAnimationFrame(anim);
      else canvas.remove();
    }
    anim();
  }
})();
