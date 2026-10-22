/**
 * ============================================================
 * SAANKALP VOCAL RECALL & AUDIO VAULT MODULE (vr- prefix throughout)
 * 90-Second Active Vocal Recitation & Voice Memo Vault
 * Self-contained IIFE — 100% Offline, Zero Regression
 * Storage: Local IndexedDB ("SaankalpVoiceVaultDB")
 * ============================================================
 */

;(function voiceRecallModule() {
  'use strict';

  /* ─── CONSTANTS & CONFIG ──────────────────────────────────── */
  const DB_NAME = 'SaankalpVoiceVaultDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'voice_memos';
  const MAX_RECORD_SECONDS = 90;

  let dbInstance = null;
  let mediaRecorder = null;
  let audioStream = null;
  let recordedChunks = [];
  let recordTimerInterval = null;
  let secondsElapsed = 0;
  let currentRecordingBlob = null;
  let currentRecordingDuration = 0;
  let activeAudioContext = null;
  let activeAnalyser = null;
  let animFrameId = null;

  // Active topic context for current recording
  let activeTargetContext = {
    entryId: 'r0_sprint',
    topic: "Today's Complete Same-Day (R0) Topic Sprint",
    subject: "Active Recall"
  };

  // Real-time speech recognition if supported
  let speechRecognizer = null;
  let currentTranscript = '';

  /* ─── INDEXED-DB ENGINE ───────────────────────────────────── */
  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('entryId', 'entryId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function saveVoiceMemo(memoData) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const memo = {
        id: 'memo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        entryId: memoData.entryId || 'r0_sprint',
        topic: memoData.topic || "Daily Vocal Recall",
        subject: memoData.subject || "General Studies",
        date: memoData.date || getTodayYMD(),
        duration: memoData.duration || 0,
        blob: memoData.blob,
        transcript: memoData.transcript || '',
        createdAt: Date.now()
      };
      const req = store.add(memo);
      req.onsuccess = () => {
        resolve(memo);
        updateVaultCountBadge();
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function getAllVoiceMemos() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => b.createdAt - a.createdAt);
        resolve(list);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function deleteVoiceMemo(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => {
        resolve(true);
        updateVaultCountBadge();
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function getTodayYMD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /* ─── INJECT MODAL & STYLES ───────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('vr-styles')) return;
    const style = document.createElement('style');
    style.id = 'vr-styles';
    style.textContent = `
      /* VOCAL RECALL MODAL & WIDGETS */
      .vr-modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 10005;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
        opacity: 0;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .vr-modal-overlay.active {
        display: flex;
        opacity: 1;
      }
      .vr-modal-card {
        background: #FFFFFF;
        border-radius: 24px;
        width: 100%;
        max-width: 580px;
        max-height: 92vh;
        overflow-y: auto;
        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2);
        display: flex;
        flex-direction: column;
        animation: vrPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes vrPopIn {
        from { transform: scale(0.92) translateY(18px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
      .vr-header {
        padding: 18px 22px;
        background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
        color: #FFFFFF;
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .vr-header-title {
        font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
        font-size: 16px;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 10px;
        letter-spacing: -0.2px;
      }
      .vr-close-btn {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #FFFFFF;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .vr-close-btn:hover {
        background: rgba(255, 255, 255, 0.28);
        transform: scale(1.05);
      }
      .vr-body {
        padding: 22px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .vr-topic-badge-box {
        background: #F1F5F9;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        padding: 12px 16px;
        width: 100%;
        margin-bottom: 20px;
        box-sizing: border-box;
        text-align: left;
      }
      .vr-topic-title {
        font-size: 14.5px;
        font-weight: 800;
        color: #0F172A;
        margin-top: 4px;
        line-height: 1.4;
      }
      .vr-rec-ring-wrap {
        position: relative;
        width: 150px;
        height: 150px;
        margin: 10px 0 16px 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .vr-rec-svg {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        transform: rotate(-90deg);
      }
      .vr-rec-bg-ring {
        fill: none;
        stroke: #E2E8F0;
        stroke-width: 6;
      }
      .vr-rec-progress-ring {
        fill: none;
        stroke: #2563EB;
        stroke-width: 6;
        stroke-linecap: round;
        stroke-dasharray: 440;
        stroke-dashoffset: 0;
        transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
      }
      .vr-rec-progress-ring.is-recording {
        stroke: #DC2626;
      }
      .vr-record-main-btn {
        width: 108px;
        height: 108px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
        color: #FFFFFF;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        z-index: 2;
      }
      .vr-record-main-btn:hover {
        transform: scale(1.05);
      }
      .vr-record-main-btn.is-recording {
        background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
        box-shadow: 0 0 0 10px rgba(220, 38, 38, 0.2), 0 8px 28px rgba(220, 38, 38, 0.45);
        animation: vrPulse 1.6s infinite;
      }
      @keyframes vrPulse {
        0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
        70% { box-shadow: 0 0 0 16px rgba(220, 38, 38, 0); }
        100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
      }
      .vr-timer-display {
        font-family: var(--font-mono, monospace);
        font-size: 26px;
        font-weight: 800;
        color: #0F172A;
        margin-top: 4px;
        letter-spacing: -0.5px;
      }
      .vr-canvas-visualizer {
        width: 100%;
        height: 44px;
        border-radius: 10px;
        background: #F8FAFC;
        margin: 12px 0;
        display: none;
      }
      .vr-live-transcript {
        width: 100%;
        max-height: 80px;
        overflow-y: auto;
        background: #F8FAFC;
        border: 1px dashed #CBD5E1;
        border-radius: 12px;
        padding: 8px 12px;
        font-size: 12px;
        color: #475569;
        text-align: left;
        line-height: 1.4;
        box-sizing: border-box;
        margin-top: 10px;
        display: none;
      }
      /* PLAYBACK STRIP */
      .vr-player-box {
        width: 100%;
        background: #F1F5F9;
        border: 1px solid #CBD5E1;
        border-radius: 16px;
        padding: 14px 16px;
        margin-top: 14px;
        box-sizing: border-box;
        display: none;
      }
      .vr-player-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .vr-play-circle-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        background: #2563EB;
        color: #FFFFFF;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: transform 0.2s ease;
      }
      .vr-play-circle-btn:hover {
        transform: scale(1.08);
      }
      .vr-scrubber-bar {
        flex: 1;
        -webkit-appearance: none;
        height: 6px;
        border-radius: 4px;
        background: #CBD5E1;
        outline: none;
        cursor: pointer;
      }
      .vr-scrubber-bar::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #2563EB;
        cursor: pointer;
      }
      .vr-actions-row {
        display: flex;
        gap: 8px;
        width: 100%;
        margin-top: 16px;
        flex-wrap: wrap;
      }
      .vr-btn-primary {
        flex: 2;
        min-width: 160px;
        background: linear-gradient(135deg, #059669 0%, #10B981 100%);
        color: #FFFFFF;
        border: none;
        padding: 12px 18px;
        border-radius: 12px;
        font-size: 13.5px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 14px rgba(5, 150, 105, 0.25);
        transition: all 0.2s;
      }
      .vr-btn-primary:hover {
        opacity: 0.95;
      }
      .vr-btn-secondary {
        flex: 1;
        min-width: 100px;
        background: #FFFFFF;
        color: #475569;
        border: 1.5px solid #CBD5E1;
        padding: 12px 14px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .vr-btn-secondary:hover {
        background: #F8FAFC;
        color: #0F172A;
      }

      /* VAULT LIST MODAL */
      .vr-vault-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        max-height: 380px;
        overflow-y: auto;
        padding: 4px;
        box-sizing: border-box;
      }
      .vr-vault-item {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.02);
      }
      .vr-vault-item-title {
        font-size: 13.5px;
        font-weight: 800;
        color: #0F172A;
        line-height: 1.35;
      }
      .vr-vault-item-meta {
        font-size: 11px;
        color: #64748B;
        margin-top: 3px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* R0 HOME INTEGRATION PILL BUTTONS */
      .r0-vocal-pill-btn {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(79, 70, 229, 0.25) 100%);
        border: 1.5px solid rgba(165, 180, 252, 0.6);
        color: #FFFFFF;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
      }
      .r0-vocal-pill-btn:hover {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.35) 0%, rgba(79, 70, 229, 0.4) 100%);
        transform: translateY(-1px);
        border-color: #FFFFFF;
      }
    `;
    document.head.appendChild(style);
  }

  function injectModals() {
    if (document.getElementById('voiceRecallModalOverlay')) return;

    // 1. RECORDER MODAL
    const recModal = document.createElement('div');
    recModal.id = 'voiceRecallModalOverlay';
    recModal.className = 'vr-modal-overlay';
    recModal.onclick = (e) => {
      if (e.target && e.target.id === 'voiceRecallModalOverlay') closeVoiceRecallModal();
    };
    recModal.innerHTML = `
      <div class="vr-modal-card">
        <div class="vr-header">
          <div class="vr-header-title">
            <span style="font-size: 20px; background: rgba(255,255,255,0.2); width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">🎙️</span>
            <div>
              <div>90-SECOND VOCAL RECALL</div>
              <div style="font-size: 11px; opacity: 0.8; font-weight: 500;">Active Spaced-Repetition Voice Memorizer</div>
            </div>
          </div>
          <button class="vr-close-btn" onclick="window.VoiceRecallModule.closeModal()">&times;</button>
        </div>

        <div class="vr-body">
          <div class="vr-topic-badge-box">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span id="vrModalSubBadge" style="background: #2563EB; color: #FFF; font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 6px;">Same-Day R0</span>
              <span style="font-size: 11px; color: #64748B; font-weight: 600;">Max: 90 Seconds</span>
            </div>
            <div class="vr-topic-title" id="vrModalTopicTitle">Today's Complete Topic Sprint</div>
          </div>

          <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-bottom: 8px;">
            💡 <em>Look away from your notes. Recite core definitions, articles, thinkers, or flowchart points out loud before the timer rings!</em>
          </div>

          <div class="vr-rec-ring-wrap">
            <svg class="vr-rec-svg" viewBox="0 0 160 160">
              <circle class="vr-rec-bg-ring" cx="80" cy="80" r="70"></circle>
              <circle class="vr-rec-progress-ring" id="vrProgressRing" cx="80" cy="80" r="70"></circle>
            </svg>
            <button class="vr-record-main-btn" id="vrMainRecordBtn" onclick="window.VoiceRecallModule.toggleRecording()">
              <span id="vrRecordBtnIcon" style="font-size: 32px;">🎙️</span>
              <span id="vrRecordBtnLabel" style="font-size: 11px; font-weight: 800; margin-top: 2px;">RECITE</span>
            </button>
          </div>

          <div class="vr-timer-display" id="vrTimerText">01:30</div>
          <div id="vrStatusPrompt" style="font-size: 12px; font-weight: 700; color: #2563EB; margin-top: 2px;">Tap to Start Vocal Sprint</div>

          <canvas class="vr-canvas-visualizer" id="vrVisualizerCanvas" width="480" height="44"></canvas>

          <div class="vr-live-transcript" id="vrLiveTranscript">
            <span style="font-weight: 700; color: #0F172A;">Live Speech:</span> <span id="vrTranscriptText">Listening...</span>
          </div>

          <!-- Playback Strip after stop -->
          <div class="vr-player-box" id="vrPlayerBox">
            <div class="vr-player-row">
              <button class="vr-play-circle-btn" id="vrPlayPreviewBtn" onclick="window.VoiceRecallModule.togglePreviewPlay()">▶</button>
              <div style="flex:1;">
                <input type="range" class="vr-scrubber-bar" id="vrScrubber" value="0" min="0" max="100" step="1" oninput="window.VoiceRecallModule.seekPreview(this.value)"/>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; font-family: var(--font-mono, monospace); margin-top: 2px;">
                  <span id="vrCurTimeText">00:00</span>
                  <span id="vrTotalTimeText">00:00</span>
                </div>
              </div>
            </div>
            
            <div class="vr-actions-row">
              <button class="vr-btn-primary" onclick="window.VoiceRecallModule.saveCurrentRecording()">
                <span>💾</span> Save to Voice Vault
              </button>
              <button class="vr-btn-secondary" onclick="window.VoiceRecallModule.redoRecording()">
                <span>🔄</span> Redo
              </button>
              <button class="vr-btn-secondary" onclick="window.VoiceRecallModule.downloadCurrentRecording()" title="Download audio note">
                <span>⬇️</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(recModal);

    // 2. VAULT PLAYLIST MODAL
    const vaultModal = document.createElement('div');
    vaultModal.id = 'voiceVaultModalOverlay';
    vaultModal.className = 'vr-modal-overlay';
    vaultModal.onclick = (e) => {
      if (e.target && e.target.id === 'voiceVaultModalOverlay') closeVoiceVaultModal();
    };
    vaultModal.innerHTML = `
      <div class="vr-modal-card">
        <div class="vr-header" style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);">
          <div class="vr-header-title">
            <span style="font-size: 20px; background: rgba(255,255,255,0.2); width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">🎧</span>
            <div>
              <div>VOICE NOTES VAULT</div>
              <div style="font-size: 11px; opacity: 0.85; font-weight: 500;">Recorded Vocal Recitations Playlist</div>
            </div>
          </div>
          <button class="vr-close-btn" onclick="window.VoiceRecallModule.closeVaultModal()">&times;</button>
        </div>

        <div class="vr-body" style="padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 13px; font-weight: 800; color: #1E293B;" id="vrVaultStatsLabel">0 Voice Recitations</div>
            <button onclick="window.VoiceRecallModule.openModal()" style="background: #2563EB; color: #FFF; border: none; padding: 6px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">
              + New Vocal Memo
            </button>
          </div>

          <div class="vr-vault-list" id="vrVaultListContainer">
            <!-- Dynamic Memos -->
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(vaultModal);
  }

  /* ─── RECORDING LOGIC ─────────────────────────────────────── */
  async function startRecording() {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      alert("Microphone access is needed for Vocal Recall. Please allow mic permission in your browser site settings.");
      return;
    }

    // Supported MIME types
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    let selectedMime = '';
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    recordedChunks = [];
    currentRecordingBlob = null;
    secondsElapsed = 0;

    mediaRecorder = new MediaRecorder(audioStream, selectedMime ? { mimeType: selectedMime } : {});
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      currentRecordingDuration = secondsElapsed;
      currentRecordingBlob = new Blob(recordedChunks, { type: selectedMime || 'audio/webm' });
      stopStreamTracks();
      showPlaybackPreview();
    };

    mediaRecorder.start(250);

    // Setup Web Audio Analyser Visualizer
    setupVisualizer(audioStream);

    // Setup Speech Recognition if available
    setupSpeechRecognition();

    // UI Updates
    const mainBtn = document.getElementById('vrMainRecordBtn');
    const btnLabel = document.getElementById('vrRecordBtnLabel');
    const btnIcon = document.getElementById('vrRecordBtnIcon');
    const ring = document.getElementById('vrProgressRing');
    const statusPrompt = document.getElementById('vrStatusPrompt');
    const playerBox = document.getElementById('vrPlayerBox');

    if (playerBox) playerBox.style.display = 'none';
    if (mainBtn) mainBtn.classList.add('is-recording');
    if (btnIcon) btnIcon.textContent = '⏹';
    if (btnLabel) btnLabel.textContent = 'FINISH';
    if (ring) ring.classList.add('is-recording');
    if (statusPrompt) {
      statusPrompt.textContent = "🔴 Reciting Out Loud... Tap ⏹ When Done";
      statusPrompt.style.color = "#DC2626";
    }

    const canvas = document.getElementById('vrVisualizerCanvas');
    if (canvas) canvas.style.display = 'block';

    const transcriptBox = document.getElementById('vrLiveTranscript');
    if (transcriptBox && speechRecognizer) transcriptBox.style.display = 'block';

    // Countdown Timer (90 seconds down to 0)
    updateTimerUI(MAX_RECORD_SECONDS);
    const circumference = 2 * Math.PI * 70; // r=70 -> ~440

    recordTimerInterval = setInterval(() => {
      secondsElapsed++;
      const secondsLeft = Math.max(0, MAX_RECORD_SECONDS - secondsElapsed);
      updateTimerUI(secondsLeft);

      // Update circular SVG progress
      if (ring) {
        const offset = (secondsElapsed / MAX_RECORD_SECONDS) * circumference;
        ring.style.strokeDashoffset = String(offset);
      }

      if (secondsElapsed >= MAX_RECORD_SECONDS) {
        stopRecording();
      }
    }, 1000);
  }

  function stopRecording() {
    if (recordTimerInterval) clearInterval(recordTimerInterval);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch(e){}
    }
    stopVisualizer();

    const mainBtn = document.getElementById('vrMainRecordBtn');
    const btnLabel = document.getElementById('vrRecordBtnLabel');
    const btnIcon = document.getElementById('vrRecordBtnIcon');
    const ring = document.getElementById('vrProgressRing');
    const statusPrompt = document.getElementById('vrStatusPrompt');

    if (mainBtn) mainBtn.classList.remove('is-recording');
    if (btnIcon) btnIcon.textContent = '✓';
    if (btnLabel) btnLabel.textContent = 'DONE';
    if (ring) ring.classList.remove('is-recording');
    if (statusPrompt) {
      statusPrompt.textContent = "🎧 Vocal Recitation Completed! Review Below";
      statusPrompt.style.color = "#059669";
    }
  }

  function stopStreamTracks() {
    if (audioStream) {
      audioStream.getTracks().forEach(t => t.stop());
      audioStream = null;
    }
  }

  function updateTimerUI(secLeft) {
    const timerText = document.getElementById('vrTimerText');
    if (timerText) timerText.textContent = formatTime(secLeft);
  }

  /* ─── REAL-TIME VISUALIZER ────────────────────────────────── */
  function setupVisualizer(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      activeAudioContext = new AudioCtx();
      const source = activeAudioContext.createMediaStreamSource(stream);
      activeAnalyser = activeAudioContext.createAnalyser();
      activeAnalyser.fftSize = 64;
      source.connect(activeAnalyser);

      const canvas = document.getElementById('vrVisualizerCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const bufferLength = activeAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function draw() {
        animFrameId = requestAnimationFrame(draw);
        activeAnalyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillStyle = `rgba(37, 99, 235, ${0.4 + (dataArray[i]/255)*0.6})`;
          ctx.beginPath();
          ctx.roundRect(x, canvas.height - barHeight, barWidth - 3, barHeight, [4, 4, 0, 0]);
          ctx.fill();
          x += barWidth;
        }
      }
      draw();
    } catch (e) {
      console.warn('[Visualizer not initialized]:', e);
    }
  }

  function stopVisualizer() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (activeAudioContext) {
      try { activeAudioContext.close(); } catch(e){}
      activeAudioContext = null;
    }
    const canvas = document.getElementById('vrVisualizerCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }

  /* ─── SPEECH RECOGNITION (OPTIONAL) ───────────────────────── */
  function setupSpeechRecognition() {
    currentTranscript = '';
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      speechRecognizer = new SpeechRec();
      speechRecognizer.continuous = true;
      speechRecognizer.interimResults = true;
      speechRecognizer.lang = 'en-IN';

      speechRecognizer.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const textSpan = document.getElementById('vrTranscriptText');
        if (textSpan) {
          textSpan.textContent = (currentTranscript + ' ' + interim).trim() || 'Listening...';
        }
      };

      speechRecognizer.start();
    } catch (e) {
      console.warn('SpeechRecognition failed to start:', e);
    }
  }

  /* ─── PREVIEW PLAYBACK ────────────────────────────────────── */
  let previewAudio = null;

  function showPlaybackPreview() {
    if (!currentRecordingBlob) return;
    const playerBox = document.getElementById('vrPlayerBox');
    if (playerBox) playerBox.style.display = 'block';

    const audioUrl = URL.createObjectURL(currentRecordingBlob);
    if (previewAudio) {
      previewAudio.pause();
      previewAudio = null;
    }
    previewAudio = new Audio(audioUrl);

    const playBtn = document.getElementById('vrPlayPreviewBtn');
    const scrubber = document.getElementById('vrScrubber');
    const curTimeText = document.getElementById('vrCurTimeText');
    const totalTimeText = document.getElementById('vrTotalTimeText');

    if (totalTimeText) totalTimeText.textContent = formatTime(currentRecordingDuration);
    if (curTimeText) curTimeText.textContent = '00:00';
    if (scrubber) scrubber.value = '0';
    if (playBtn) playBtn.textContent = '▶';

    previewAudio.ontimeupdate = () => {
      if (!previewAudio) return;
      const cur = previewAudio.currentTime;
      const dur = previewAudio.duration || currentRecordingDuration || 1;
      if (curTimeText) curTimeText.textContent = formatTime(cur);
      if (scrubber) scrubber.value = String((cur / dur) * 100);
    };

    previewAudio.onended = () => {
      if (playBtn) playBtn.textContent = '▶';
      if (scrubber) scrubber.value = '0';
      if (curTimeText) curTimeText.textContent = '00:00';
    };
  }

  function togglePreviewPlay() {
    if (!previewAudio) return;
    const playBtn = document.getElementById('vrPlayPreviewBtn');
    if (previewAudio.paused) {
      previewAudio.play();
      if (playBtn) playBtn.textContent = '⏸';
    } else {
      previewAudio.pause();
      if (playBtn) playBtn.textContent = '▶';
    }
  }

  function seekPreview(pct) {
    if (!previewAudio || !previewAudio.duration) return;
    previewAudio.currentTime = (pct / 100) * previewAudio.duration;
  }

  /* ─── SAVE / REDO / DOWNLOAD ──────────────────────────────── */
  async function saveCurrentRecording() {
    if (!currentRecordingBlob) return;

    const saved = await saveVoiceMemo({
      topic: activeTargetContext.topic,
      subject: activeTargetContext.subject,
      entryId: activeTargetContext.entryId,
      duration: currentRecordingDuration,
      blob: currentRecordingBlob,
      transcript: currentTranscript
    });

    // Auto-mark topic as R0 done if it's a specific entry
    if (activeTargetContext.entryId && activeTargetContext.entryId !== 'r0_sprint') {
      try {
        if (typeof window.toggleMilestoneState === 'function') {
          window.toggleMilestoneState(activeTargetContext.entryId, 'r0');
        }
      } catch(e){}
    }

    alert(`🎉 Voice Memo Saved to Vault!\nRecitation Duration: ${formatTime(currentRecordingDuration)}\nTopic: ${activeTargetContext.topic}`);
    closeVoiceRecallModal();
    renderR0Integration();
  }

  function redoRecording() {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio = null;
    }
    const playerBox = document.getElementById('vrPlayerBox');
    if (playerBox) playerBox.style.display = 'none';

    const ring = document.getElementById('vrProgressRing');
    if (ring) {
      ring.style.strokeDashoffset = '0';
      ring.classList.remove('is-recording');
    }
    updateTimerUI(MAX_RECORD_SECONDS);

    const mainBtn = document.getElementById('vrMainRecordBtn');
    const btnLabel = document.getElementById('vrRecordBtnLabel');
    const btnIcon = document.getElementById('vrRecordBtnIcon');
    const statusPrompt = document.getElementById('vrStatusPrompt');

    if (mainBtn) mainBtn.classList.remove('is-recording');
    if (btnIcon) btnIcon.textContent = '🎙️';
    if (btnLabel) btnLabel.textContent = 'RECITE';
    if (statusPrompt) {
      statusPrompt.textContent = "Tap to Start Vocal Sprint";
      statusPrompt.style.color = "#2563EB";
    }
  }

  function downloadCurrentRecording() {
    if (!currentRecordingBlob) return;
    const url = URL.createObjectURL(currentRecordingBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vocal_Recall_${getTodayYMD()}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ─── MODAL CONTROLLERS ───────────────────────────────────── */
  function openVoiceRecallModal(entryId, topicTitle, subjectName) {
    injectStyles();
    injectModals();

    activeTargetContext = {
      entryId: entryId || 'r0_sprint',
      topic: topicTitle || "Today's Complete Same-Day (R0) Topic Sprint",
      subject: subjectName || "Active Recall"
    };

    const topicEl = document.getElementById('vrModalTopicTitle');
    const subBadge = document.getElementById('vrModalSubBadge');
    if (topicEl) topicEl.textContent = activeTargetContext.topic;
    if (subBadge) subBadge.textContent = activeTargetContext.subject || 'Same-Day R0';

    redoRecording();

    const overlay = document.getElementById('voiceRecallModalOverlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeVoiceRecallModal() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
    }
    stopStreamTracks();
    if (previewAudio) {
      previewAudio.pause();
      previewAudio = null;
    }
    const overlay = document.getElementById('voiceRecallModalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  async function openVoiceVaultModal() {
    injectStyles();
    injectModals();

    const overlay = document.getElementById('voiceVaultModalOverlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    await renderVaultList();
  }

  function closeVoiceVaultModal() {
    if (activeVaultAudio) {
      activeVaultAudio.pause();
      activeVaultAudio = null;
    }
    const overlay = document.getElementById('voiceVaultModalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  let activeVaultAudio = null;
  let activePlayingId = null;

  async function renderVaultList() {
    const container = document.getElementById('vrVaultListContainer');
    const statsLabel = document.getElementById('vrVaultStatsLabel');
    if (!container) return;

    const list = await getAllVoiceMemos();

    if (statsLabel) {
      const totalSec = list.reduce((acc, m) => acc + (m.duration || 0), 0);
      const mins = Math.round(totalSec / 60);
      statsLabel.innerHTML = `<span>📚 ${list.length} Voice Recitation${list.length === 1 ? '' : 's'}</span> &middot; <span style="color:#059669;">${mins} mins vocal practice</span>`;
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 16px; color: #64748B;">
          <div style="font-size: 32px; margin-bottom: 8px;">🎙️</div>
          <div style="font-size: 14.5px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">Voice Vault is Empty</div>
          <div style="font-size: 12.5px; color: #64748B;">Tap "90s Vocal Recitation" on the Home tab to record your first spoken recall memo!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(item => {
      const isThisPlaying = (activePlayingId === item.id);
      return `
        <div class="vr-vault-item" id="vrVaultItem_${item.id}">
          <div style="flex:1; min-width: 0;">
            <div class="vr-vault-item-title">${item.topic}</div>
            <div class="vr-vault-item-meta">
              <span style="background: #EFF6FF; color: #2563EB; font-weight: 800; padding: 1.5px 6px; border-radius: 6px;">${item.subject || 'R0'}</span>
              <span>📅 ${item.date}</span>
              <span>⏱️ ${formatTime(item.duration)}</span>
            </div>
            ${item.transcript ? `<div style="font-size:11px; color:#475569; margin-top:4px; font-style:italic; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">"${item.transcript}"</div>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
            <button onclick="window.VoiceRecallModule.playVaultItem('${item.id}')" style="width: 38px; height: 38px; border-radius: 50%; border: none; background: ${isThisPlaying ? '#059669' : '#2563EB'}; color: #FFF; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
              ${isThisPlaying ? '⏸' : '▶'}
            </button>
            <button onclick="window.VoiceRecallModule.downloadVaultItem('${item.id}')" title="Download audio note" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid #CBD5E1; background: #FFF; color: #475569; font-size: 12px; cursor: pointer;">
              ⬇️
            </button>
            <button onclick="window.VoiceRecallModule.deleteVaultItem('${item.id}')" title="Delete note" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid #FECACA; background: #FEF2F2; color: #DC2626; font-size: 12px; cursor: pointer;">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function playVaultItem(id) {
    const list = await getAllVoiceMemos();
    const item = list.find(m => m.id === id);
    if (!item || !item.blob) return;

    if (activePlayingId === id && activeVaultAudio) {
      if (activeVaultAudio.paused) {
        activeVaultAudio.play();
      } else {
        activeVaultAudio.pause();
        activePlayingId = null;
      }
      renderVaultList();
      return;
    }

    if (activeVaultAudio) {
      activeVaultAudio.pause();
      activeVaultAudio = null;
    }

    const url = URL.createObjectURL(item.blob);
    activeVaultAudio = new Audio(url);
    activePlayingId = id;
    renderVaultList();

    activeVaultAudio.play();
    activeVaultAudio.onended = () => {
      activePlayingId = null;
      renderVaultList();
    };
  }

  async function downloadVaultItem(id) {
    const list = await getAllVoiceMemos();
    const item = list.find(m => m.id === id);
    if (!item || !item.blob) return;
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vocal_Memo_${item.date}_${item.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function deleteVaultItem(id) {
    if (!confirm("Are you sure you want to delete this voice recitation?")) return;
    if (activePlayingId === id && activeVaultAudio) {
      activeVaultAudio.pause();
      activeVaultAudio = null;
      activePlayingId = null;
    }
    await deleteVoiceMemo(id);
    renderVaultList();
  }

  async function updateVaultCountBadge() {
    try {
      const list = await getAllVoiceMemos();
      const badge = document.getElementById('voiceVaultCount');
      if (badge) badge.textContent = String(list.length);
    } catch(e){}
  }

  /* ─── INTEGRATION INTO SAME-DAY R0 QUEUE ──────────────────── */
  function renderR0Integration() {
    const r0Header = document.querySelector('.r0-home-header');
    if (!r0Header) return;

    if (!document.getElementById('r0AudioActionStrip')) {
      const strip = document.createElement('div');
      strip.id = 'r0AudioActionStrip';
      strip.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; width: 100%;';
      strip.innerHTML = `
        <button class="r0-vocal-pill-btn" onclick="window.VoiceRecallModule.openModal()" title="Start 90-Second Vocal Recall Sprint">
          <span>🎙️</span> 90s Vocal Recitation
        </button>
        <button class="r0-vocal-pill-btn" onclick="window.VoiceRecallModule.openVaultModal()" style="background: rgba(255, 255, 255, 0.18); border-color: rgba(255, 255, 255, 0.35);">
          <span>🎧</span> Voice Vault (<span id="voiceVaultCount">0</span>)
        </button>
      `;
      r0Header.appendChild(strip);
    }

    updateVaultCountBadge();
  }

  /* ─── INITIALIZATION ──────────────────────────────────────── */
  function init() {
    injectStyles();
    injectModals();
    renderR0Integration();

    // Hook into renderAll / renderDashboardQueue calls non-destructively
    const origRender = window.renderDashboardQueue;
    if (typeof origRender === 'function') {
      window.renderDashboardQueue = function() {
        origRender.apply(this, arguments);
        renderR0Integration();
      };
    }

    setTimeout(renderR0Integration, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─── PUBLIC MODULE API ───────────────────────────────────── */
  window.VoiceRecallModule = {
    openModal: openVoiceRecallModal,
    closeModal: closeVoiceRecallModal,
    openVaultModal: openVoiceVaultModal,
    closeVaultModal: closeVoiceVaultModal,
    toggleRecording: () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
      } else {
        startRecording();
      }
    },
    togglePreviewPlay: togglePreviewPlay,
    seekPreview: seekPreview,
    saveCurrentRecording: saveCurrentRecording,
    redoRecording: redoRecording,
    downloadCurrentRecording: downloadCurrentRecording,
    playVaultItem: playVaultItem,
    downloadVaultItem: downloadVaultItem,
    deleteVaultItem: deleteVaultItem
  };

})();
