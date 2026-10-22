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
      const tx = dbInstance.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function getAllDbRecords(storeName) {
    if (!dbInstance) return Promise.resolve([]);
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
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
      await initDatabase();
      bindEvents();
      if (window.innerWidth <= 900) {
        switchMobileTab('notes');
      }
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
      showToast(`Restored ${pages.length} pages from previous session.`);
    }
  }

  function bindEvents() {
    const dropzone = document.getElementById('canDropzone');
    const fileInput = document.getElementById('canFileInput');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

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
        const files = e.dataTransfer.files;
        if (files && files.length > 0) handleIncomingFiles(files);
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) handleIncomingFiles(e.target.files);
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
        if (tab) switchMobileTab(tab);
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
    const dropzone = document.getElementById('canDropzone');
    if (dropzone) {
      if (state.pageRecords.length > 0) dropzone.classList.add('can-has-file');
      else dropzone.classList.remove('can-has-file');
    }
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
            <div class="can-note-item" id="note_${itemKey}" data-key="${itemKey}">
              <div class="can-item-meta-strip">
                <span class="can-item-type-pill" style="background: rgba(37,99,235,0.08); color: var(--can-primary);">
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

  function switchMobileTab(tab) {
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

    if (window.innerWidth <= 900) {
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

  // Selectable PDF Generation - Compact, High-Yield Editorial Layout
  window.canExportPdf = async function (type) {
    showToast('Generating clean revision PDF...');
    try {
      const jspdfModule = await ensureJsPdf();
      const { jsPDF } = jspdfModule;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      const allArticles = compileAllArticles();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Printable comfortable margins (0.65 in)
      const margin = 44;
      const contentWidth = pageWidth - (margin * 2);
      const topMargin = 45;
      const bottomMargin = 45;

      let y = topMargin;

      // Helper: Check space and add page if needed
      function ensureSpace(neededHeight) {
        if (y + neededHeight > pageHeight - bottomMargin) {
          doc.addPage();
          y = topMargin;
        }
      }

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
          .replace(/^\[(?:HIGHLIGHT|UNDERLINE|BOXED|HANDWRITTEN|NOTE|HIGHLIGHTED|UNDERLINED)[^\]]*\]\s*/i, '')
          .replace(/^(?:highlight|underline|boxed|highlighted|underlined|note):\s*/i, '')
          .trim();
      }

      // --- PAGE 1: DOSSIER HEADER ---
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, y, contentWidth, 2.5, 'F');
      y += 12;

      const titleText = state.magazineMeta.title || 'Current Affairs Notes';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text(titleText, margin, y);
      y += 14;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text('UPSC CSE CANDIDATE REVISION DOSSIER', margin, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      doc.text(`Extracted: ${dateStr}  |  Pages Scanned: ${state.pageRecords.length}`, pageWidth - margin, y, { align: 'right' });
      y += 10;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;

      // --- CONTENT ITERATION ---
      allArticles.forEach((secGroup) => {
        if (type !== 'all' && secGroup.section.toLowerCase() !== type.toLowerCase()) return;

        // SECTION HEADER BANNER (e.g. POLITY & GOVERNANCE)
        ensureSpace(28);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, y, contentWidth, 17, 2, 2, 'F');
        doc.setFillColor(37, 99, 235);
        doc.rect(margin, y, 3.5, 17, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(secGroup.section.toUpperCase(), margin + 10, y + 11.5);
        y += 24;

        secGroup.articles.forEach((art) => {
          // Require at least 65pt space so headings are NEVER printed as orphans at page bottom!
          ensureSpace(65);

          // ARTICLE HEADING
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          const headingLines = doc.splitTextToSize(art.heading, contentWidth - 45);
          doc.text(headingLines, margin, y);

          if (art.pages && art.pages.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`p. ${art.pages.join(', ')}`, pageWidth - margin, y, { align: 'right' });
          }
          y += (headingLines.length * 11) + 4;

          // AI TAKEAWAY BOX (Compact & clean)
          if (art.takeaway && art.takeaway.trim().length > 5) {
            const takeawayText = cleanNoteText(art.takeaway);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            const takeawayLines = doc.splitTextToSize(takeawayText, contentWidth - 18);
            const boxHeight = (takeawayLines.length * 9.5) + 11;

            ensureSpace(boxHeight + 5);
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

            doc.setFillColor(16, 185, 129);
            doc.rect(margin, y, 2.5, boxHeight, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(5, 150, 105);
            doc.text('CORE TAKEAWAY', margin + 8, y + 7.5);

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor(51, 65, 85);
            doc.text(takeawayLines, margin + 8, y + 16.5);
            y += boxHeight + 6;
          }

          // EXTRACTED POINTS (RENDERED LINE-BY-LINE: GUARANTEED ZERO CUTOFF AT BOTTOM OR RIGHT!)
          art.items.forEach((it) => {
            const rawClean = cleanNoteText(it.text);
            if (!rawClean) return;

            const isHandwritten = it.type === 'handwritten';
            const prefixOffset = isHandwritten ? 32 : 12;
            const textWidth = contentWidth - prefixOffset;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            const noteLines = doc.splitTextToSize(rawClean, textWidth);

            // Render line-by-line with exact page-boundary checks
            for (let lineIdx = 0; lineIdx < noteLines.length; lineIdx++) {
              if (y + 11 > pageHeight - bottomMargin) {
                doc.addPage();
                y = topMargin;
              }

              // Draw bullet indicator only on the very first line of each note
              if (lineIdx === 0) {
                if (isHandwritten) {
                  // Crisp vector badge for handwritten margin notes (no broken emojis)
                  doc.setFillColor(239, 246, 255);
                  doc.roundedRect(margin, y - 7.5, 26, 9.5, 2, 2, 'F');
                  doc.setFont('helvetica', 'bold');
                  doc.setFontSize(6.5);
                  doc.setTextColor(37, 99, 235);
                  doc.text('NOTE', margin + 4.5, y);
                } else {
                  // Crisp vector circle bullet
                  doc.setFillColor(59, 130, 246);
                  doc.circle(margin + 4, y - 2.5, 1.8, 'F');
                }
              }

              // Note Line Text
              doc.setFont('helvetica', isHandwritten ? 'italic' : 'normal');
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              doc.text(noteLines[lineIdx], margin + prefixOffset, y);
              y += 11;
            }

            y += 3.5; // Space between notes
          });

          y += 8; // Spacing between articles
        });

        y += 6; // Spacing between sections
      });

      // --- RUNNING HEADER & FOOTER ON ALL PAGES ---
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        if (i > 1) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(`${state.magazineMeta.title || 'Current Affairs Notes'} • UPSC Revision Dossier`, margin, 26);
          doc.text('The Ink Lab', pageWidth - margin, 26, { align: 'right' });
          doc.setDrawColor(241, 245, 249);
          doc.line(margin, 30, pageWidth - margin, 30);
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, pageHeight - 26, pageWidth - margin, pageHeight - 26);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Extracted with The Ink Lab (Google Gemini Vision)', margin, pageHeight - 14);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 14, { align: 'right' });
      }

      const filename = `${(state.magazineMeta.title || 'Current_Affairs').replace(/[^a-zA-Z0-9_-]/g, '_')}_Revision_Notes.pdf`;
      doc.save(filename);
      showToast('PDF downloaded successfully with complete text!');
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
