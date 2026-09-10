/* ==========================================================================
   SIH 2026 - MASTER PUBLIC PARTICIPANT DISPLAY & SERVER SYNC CONTROLLER
   Vel Tech High Tech Dr. Rangarajan Dr. Sakunthala Engineering College
   ========================================================================== */

(function () {
  'use strict';

  const body = document.body;
  const startBtn = document.getElementById('startHackathonBtn');
  const prelaunchContainer = document.getElementById('prelaunchContainer');
  const countdownContainer = document.getElementById('countdownContainer');
  const completionContainer = document.getElementById('completionContainer');
  const headerStatusText = document.getElementById('headerStatusText');

  // Timer Digits & Cards
  const digitHours = document.getElementById('digitHours');
  const digitMinutes = document.getElementById('digitMinutes');
  const digitSeconds = document.getElementById('digitSeconds');

  // Progress Bar Elements
  const progressFill = document.getElementById('progressFill');
  const progressPercentage = document.getElementById('progressPercentage');
  const startTimeLabel = document.getElementById('startTimeLabel');
  const targetTimeLabel = document.getElementById('targetTimeLabel');

  // Announcement Overlay Elements
  const announcementOverlay = document.getElementById('announcementOverlay');
  const annPriorityBadge = document.getElementById('annPriorityBadge');
  const annTimeLabel = document.getElementById('annTimeLabel');
  const annHeading = document.getElementById('annHeading');
  const annDetails = document.getElementById('annDetails');
  const annProgressFill = document.getElementById('annProgressFill');
  const annTimerText = document.getElementById('annTimerText');

  // Public Reset Modal Elements
  const publicResetModal = document.getElementById('publicResetModal');
  const cancelPublicResetBtn = document.getElementById('cancelPublicResetBtn');

  // Controls
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const eventModeBtn = document.getElementById('eventModeBtn');
  const eventModeIcon = document.getElementById('eventModeIcon');
  const resetTimerBtn = document.getElementById('resetTimerBtn');
  const relaunchBtn = document.getElementById('relaunchBtn');

  // API Base URL Configuration for Render Backend
  const DEFAULT_RENDER_URL = 'https://sihcountdownveltech.onrender.com';
  const API_BASE_URL = window.API_BASE_URL ||
    (window.location.hostname.includes('vercel.app') ? DEFAULT_RENDER_URL : '');

  // State Trackers & State Machine
  let appState = 'NOT_STARTED'; // NOT_STARTED, LAUNCHING, RUNNING, PAUSED, COMPLETED
  let serverEventState = null;
  let serverClockOffset = 0; // serverTimeInSeconds - clientLocalTimeInSeconds
  let lastDisplayedTotalSeconds = null;
  let lastAnnId = null;
  let currentHours = null;
  let currentMinutes = null;
  let currentSeconds = null;
  let connectionFailed = false;
  let activeEvtSource = null;

  // Diagnostic Timing Flag
  const DEBUG_PERF = false;
  function logPerf(label, startTime) {
    if (DEBUG_PERF) {
      console.log(`[PERF DIAGNOSTIC] ${label}: ${(performance.now() - startTime).toFixed(2)}ms`);
    }
  }

  // 1. Sound Toggle Controller
  function updateSoundUI() {
    const isMuted = window.AudioEngine.isMuted();
    if (isMuted) {
      soundIcon.className = 'fa-solid fa-volume-xmark';
      soundToggleBtn.querySelector('.btn-text').textContent = 'SOUND OFF';
      soundToggleBtn.classList.remove('control-btn-primary');
    } else {
      soundIcon.className = 'fa-solid fa-volume-high';
      soundToggleBtn.querySelector('.btn-text').textContent = 'SOUND ON';
      soundToggleBtn.classList.add('control-btn-primary');
    }
  }

  function toggleSound() {
    const currentMuted = window.AudioEngine.isMuted();
    window.AudioEngine.setMuted(!currentMuted);
    updateSoundUI();
    if (!currentMuted === false) {
      window.AudioEngine.playClickSound();
    }
  }

  // 2. Event / Fullscreen Mode Controller
  function toggleEventMode() {
    body.classList.toggle('event-mode');
    const isEventMode = body.classList.contains('event-mode');

    if (isEventMode) {
      eventModeIcon.className = 'fa-solid fa-compress';
      eventModeBtn.querySelector('.btn-text').textContent = 'EXIT EVENT MODE';

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      eventModeIcon.className = 'fa-solid fa-expand';
      eventModeBtn.querySelector('.btn-text').textContent = 'ENTER EVENT MODE';

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // 3. Formatting Helpers
  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  function formatTimeOfDay(ts) {
    if (!ts) return '--:--';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // 4. Update Live Current Date & Time Indicator (Bottom-Right)
  function updateLiveClock() {
    const liveClockText = document.getElementById('liveClockText');
    if (!liveClockText) return;
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();

    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    liveClockText.textContent = `${day} ${month} ${year} • ${formattedHours}:${minutes} ${ampm}`;
  }

  // 5. Update Timer Digits (Smooth Digits Transition)
  function updateTimerDisplay(hours, minutes, seconds) {
    if (currentHours !== hours) {
      digitHours.textContent = pad2(hours);
      digitHours.classList.remove('digit-tick');
      void digitHours.offsetWidth;
      digitHours.classList.add('digit-tick');
      currentHours = hours;
    }

    if (currentMinutes !== minutes) {
      digitMinutes.textContent = pad2(minutes);
      digitMinutes.classList.remove('digit-tick');
      void digitMinutes.offsetWidth;
      digitMinutes.classList.add('digit-tick');
      currentMinutes = minutes;
    }

    if (currentSeconds !== seconds) {
      digitSeconds.textContent = pad2(seconds);
      digitSeconds.classList.remove('digit-tick');
      void digitSeconds.offsetWidth;
      digitSeconds.classList.add('digit-tick');
      currentSeconds = seconds;

      window.AudioEngine.playTickSound();
    }
  }

  // 6. Update Progress Bar
  function updateProgressBar(progressPercent, startTime, targetTime) {
    const pct = Math.min(100, Math.max(0, progressPercent || 0));
    progressFill.style.width = `${pct.toFixed(2)}%`;
    progressPercentage.textContent = `${pct.toFixed(1)}%`;

    startTimeLabel.textContent = `START: ${formatTimeOfDay(startTime)}`;
    targetTimeLabel.textContent = `FINISH: ${formatTimeOfDay(targetTime)}`;
  }

  // 7. Authoritative High-Precision Timestamp Calculation Loop
  function tickTimerLoop() {
    if (!serverEventState && appState !== 'LAUNCHING') return;

    const status = serverEventState ? serverEventState.status : (appState === 'LAUNCHING' ? 'RUNNING' : 'NOT_STARTED');
    const nowClientSeconds = Date.now() / 1000;
    const nowServerSeconds = nowClientSeconds + serverClockOffset;

    let remainingSecondsFloat = 0;
    const duration = serverEventState ? (serverEventState.duration_seconds || 86400) : 86400;

    if (status === 'RUNNING' && serverEventState && serverEventState.target_timestamp) {
      remainingSecondsFloat = Math.max(0, serverEventState.target_timestamp - nowServerSeconds);
    } else if (status === 'PAUSED' && serverEventState) {
      remainingSecondsFloat = serverEventState.remaining_seconds || 0;
    } else if (status === 'COMPLETED') {
      remainingSecondsFloat = 0;
    } else { // NOT_STARTED or LAUNCHING optimistic fallback
      remainingSecondsFloat = duration;
    }

    const remainingSecondsInt = Math.ceil(remainingSecondsFloat);

    // Update UI Digits ONLY on exact integer second boundaries (Prevents skips & drift)
    if (remainingSecondsInt !== lastDisplayedTotalSeconds) {
      lastDisplayedTotalSeconds = remainingSecondsInt;

      const hours = Math.floor(remainingSecondsInt / 3600);
      const minutes = Math.floor((remainingSecondsInt % 3600) / 60);
      const seconds = remainingSecondsInt % 60;

      updateTimerDisplay(hours, minutes, seconds);
    }

    // Update Progress Bar
    if ((status === 'RUNNING' || status === 'PAUSED' || status === 'COMPLETED') && serverEventState) {
      const elapsedSeconds = Math.max(0, duration - remainingSecondsFloat);
      const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / duration) * 100));
      updateProgressBar(progressPercent, serverEventState.start_timestamp, serverEventState.target_timestamp);
    }

    // Handle Natural Completion
    if (status === 'RUNNING' && serverEventState && remainingSecondsFloat <= 0) {
      serverEventState.status = 'COMPLETED';
      renderState(serverEventState);
    }

    // Continuously update active announcement progress line on every tick
    handleAnnouncementOverlay(serverEventState ? serverEventState.active_announcement : null);
  }

  // 8. Handle Live Announcement Overlay Display (High precision continuous rendering)
  function handleAnnouncementOverlay(ann) {
    if (!ann) {
      if (lastAnnId !== null || !announcementOverlay.classList.contains('hidden')) {
        announcementOverlay.classList.add('hidden');
        window.AudioEngine.stopAnnouncementMusic(0);
        lastAnnId = null;
      }
      return;
    }

    const nowClientSeconds = Date.now() / 1000;
    const nowServerSeconds = nowClientSeconds + serverClockOffset;
    const startedAt = ann.started_at || ann.displayed_timestamp || nowServerSeconds;
    const elapsedSeconds = Math.max(0, nowServerSeconds - startedAt);
    const audioId = ann.audio_id || ann.audio_file;
    
    // Determine effective duration: for 'until_song_complete', retrieve preloaded audio duration if available
    let duration = ann.duration_seconds || 60;
    if (ann.until_song_complete && audioId && audioId !== 'none') {
      const trackDuration = window.AudioEngine.getAudioDuration(audioId);
      if (trackDuration > 0) {
        duration = Math.ceil(trackDuration);
      }
    }

    const remainingSecondsFloat = Math.max(0, duration - elapsedSeconds);
    const remainingSecondsInt = Math.ceil(remainingSecondsFloat);

    // Hard End Check: Stop audio and hide announcement overlay IMMEDIATELY when duration expires
    if (remainingSecondsFloat <= 0) {
      announcementOverlay.classList.add('hidden');
      window.AudioEngine.stopAnnouncementMusic(0);
      lastAnnId = null;
      return;
    }

    annPriorityBadge.textContent = ann.priority || 'NORMAL';
    annPriorityBadge.className = 'ann-badge ' + (ann.priority || 'NORMAL');
    annTimeLabel.textContent = ann.time_label || formatTimeOfDay(startedAt);
    annHeading.textContent = ann.heading || '';
    annDetails.textContent = ann.message || ann.details || '';

    // Smooth transform scaling derived strictly from server timestamp (Right to Left: 1.0 -> 0.0)
    const progressRatio = Math.max(0, Math.min(1, remainingSecondsFloat / duration));
    annProgressFill.style.transform = `scaleX(${progressRatio})`;
    
    if (ann.until_song_complete) {
      annTimerText.innerHTML = `<i class="fa-solid fa-music"></i> Playing until song completes`;
    } else {
      annTimerText.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> DISMISSING IN ${remainingSecondsInt}s`;
    }

    // Show visual overlay immediately (<10ms)
    announcementOverlay.classList.remove('hidden');

    // Trigger Audio & Chime only once when a new announcement ID arrives
    if (lastAnnId !== ann.id) {
      window.AudioEngine.stopAnnouncementMusic(0);
      lastAnnId = ann.id;

      const tOverlay = performance.now();
      console.log(`[PERF DIAGNOSTIC] ANNOUNCEMENT START: ${ann.id} heading: ${ann.heading}`);
      console.log(`[PERF DIAGNOSTIC] ANNOUNCEMENT DURATION: ${duration}s, ELAPSED: ${elapsedSeconds.toFixed(2)}s`);
      
      // Explicit Audio Check: Only play audio if audioId is specified and sound_enabled is true
      if (ann.sound_enabled && audioId && audioId !== '' && audioId !== 'none') {
        window.AudioEngine.playAnnouncementChime(ann.priority);

        const seekOffset = Math.max(0, elapsedSeconds);
        window.AudioEngine.playAnnouncementMusic(
          audioId,
          ann.loop_audio,
          seekOffset,
          duration,
          () => {
            if (ann.until_song_complete) {
              announcementOverlay.classList.add('hidden');
              lastAnnId = null;
            }
          }
        );
      } else {
        // NONE — NO SOUND selected: Ensure zero audio plays
        console.log(`[PERF DIAGNOSTIC] None — No Sound selected. Visual announcement only.`);
        window.AudioEngine.stopAnnouncementMusic(0);
      }
    }
  }

  // 9. Synchronize View with Server State
  function renderState(state) {
    if (!state) return;
    serverEventState = state;
    appState = state.status;

    // Calculate Client-Server Clock Offset
    if (state.server_time) {
      const clientNowSec = Date.now() / 1000;
      serverClockOffset = state.server_time - clientNowSec;
    }

    const status = state.status;

    if (status === 'RUNNING') {
      body.className = 'state-running';
      headerStatusText.textContent = '24-HOUR HACKATHON ACTIVE';
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.add('hidden');
      countdownContainer.classList.remove('hidden');

    } else if (status === 'PAUSED') {
      body.className = 'state-running';
      headerStatusText.textContent = 'HACKATHON PAUSED';
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.add('hidden');
      countdownContainer.classList.remove('hidden');

    } else if (status === 'COMPLETED') {
      body.className = 'state-completed';
      headerStatusText.textContent = 'HACKATHON COMPLETE';
      countdownContainer.classList.add('hidden');
      prelaunchContainer.classList.add('hidden');
      completionContainer.classList.remove('hidden');

      if (!body.dataset.completionTriggered) {
        body.dataset.completionTriggered = 'true';
        window.FXEngine.triggerCompletionCeremony();
        window.AudioEngine.playVictoryFanfare();
      }

    } else { // NOT_STARTED
      body.className = 'state-prelaunch';
      headerStatusText.textContent = 'PRE-LAUNCH STATE';
      prelaunchContainer.classList.remove('hidden');
      countdownContainer.classList.add('hidden');
      completionContainer.classList.add('hidden');
    }

    // Run tick loop immediately to refresh UI
    tickTimerLoop();
  }

  function handleConnectionStatus(connected) {
    if (!connected) {
      connectionFailed = true;
      if (headerStatusText && appState === 'NOT_STARTED') {
        headerStatusText.textContent = 'CONNECTING TO BACKEND...';
      }
    } else {
      connectionFailed = false;
    }
  }

  async function fetchServerState() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/event/status`, { credentials: 'include' });
      if (res.ok) {
        const state = await res.json();
        handleConnectionStatus(true);
        renderState(state);
      } else {
        handleConnectionStatus(false);
      }
    } catch (e) {
      handleConnectionStatus(false);
    }
  }

  function initSSE() {
    try {
      if (activeEvtSource) {
        activeEvtSource.close();
        activeEvtSource = null;
      }
      const streamUrl = `${API_BASE_URL}/api/events/stream`;
      activeEvtSource = new EventSource(streamUrl, { withCredentials: true });
      activeEvtSource.onmessage = function (event) {
        try {
          const state = JSON.parse(event.data);
          handleConnectionStatus(true);
          renderState(state);
        } catch (e) {}
      };
      activeEvtSource.onerror = function () {
        if (activeEvtSource) {
          activeEvtSource.close();
          activeEvtSource = null;
        }
        handleConnectionStatus(false);
        setTimeout(initSSE, 3000);
      };
    } catch (e) {
      handleConnectionStatus(false);
      setInterval(fetchServerState, 2000);
    }
  }

  // 10. Public START HACKATHON Button — INSTANT VISUAL & SOUND RESPONSE (<100ms)
  async function initiatePublicLaunch() {
    if (appState !== 'NOT_STARTED') return;

    const tStart = performance.now();
    appState = 'LAUNCHING';

    // 1. Play inauguration sound immediately
    window.AudioEngine.playLaunchCeremonySound();
    logPerf('Sound started', tStart);

    // 2. Disable start button to prevent duplicate clicks
    startBtn.style.pointerEvents = 'none';
    startBtn.style.opacity = '0.5';

    // 3. Trigger immediate visual transition (<100ms) over dark background
    body.className = 'state-running';
    headerStatusText.textContent = '24-HOUR HACKATHON ACTIVE';
    prelaunchContainer.classList.add('hidden');
    completionContainer.classList.add('hidden');
    countdownContainer.classList.remove('hidden');
    logPerf('UI state transition', tStart);

    // 4. Trigger visual launch ceremony (Poppers, Confetti, Sparks) immediately
    window.FXEngine.triggerLaunchCeremony(() => {
      fetchServerState();
    });
    logPerf('FX ceremony triggered', tStart);

    // 5. Asynchronously dispatch start request in parallel to server
    try {
      fetch(`${API_BASE_URL}/api/event/public_start`, { method: 'POST', credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          logPerf('API start response received', tStart);
          if (data && data.event) {
            renderState(data.event);
          }
        })
        .catch(err => {
          logPerf('API start error handled', tStart);
          // Backend retry/poll fallback
          fetchServerState();
        });
    } catch (e) {
      fetchServerState();
    }
  }

  // 11. Premium Reset Confirmation Modal Display (ADMIN ONLY AFTER START)
  function handlePublicResetAttempt() {
    publicResetModal.classList.remove('hidden');
  }

  cancelPublicResetBtn.addEventListener('click', () => {
    publicResetModal.classList.add('hidden');
  });

  // Boot Application
  function initApp() {
    window.AudioEngine.loadMuteState();
    updateSoundUI();

    // Preload notification music immediately on boot
    window.AudioEngine.preloadAllMusic();

    fetchServerState();
    initSSE();

    // High-frequency 50ms tick loop for 100% accurate, zero-skip, timestamp-driven countdown
    setInterval(tickTimerLoop, 50);

    // Live bottom-right current date & time indicator update
    setInterval(updateLiveClock, 1000);
    updateLiveClock();

    startBtn.addEventListener('click', initiatePublicLaunch);
    soundToggleBtn.addEventListener('click', toggleSound);
    eventModeBtn.addEventListener('click', toggleEventMode);
    resetTimerBtn.addEventListener('click', handlePublicResetAttempt);
    relaunchBtn.addEventListener('click', handlePublicResetAttempt);

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        if (!prelaunchContainer.classList.contains('hidden') || appState === 'NOT_STARTED') {
          e.preventDefault();
          initiatePublicLaunch();
        }
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleEventMode();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleSound();
      }
    });

    // Cleanup audio on tab unload or hidden state
    const cleanupAudio = () => {
      window.AudioEngine.stopAnnouncementMusic(0);
    };
    window.addEventListener('beforeunload', cleanupAudio);
    window.addEventListener('pagehide', cleanupAudio);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cleanupAudio();
      } else {
        tickTimerLoop();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
