/* ==========================================================================
   SIH 2026 - AUDIO SYNTHESIZER & EVENT ANNOUNCEMENT CHIME ENGINE
   Zero-dependency Web Audio API sound engine with inauguration & announcement chimes.
   ========================================================================== */

(function () {
  'use strict';

  let audioCtx = null;
  let isMuted = false;
  let launchAudioBuffer = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function setMuted(muted) {
    isMuted = muted;
    try {
      localStorage.setItem('SIH_2026_SOUND_MUTED', muted ? 'true' : 'false');
    } catch (e) {}
  }

  function loadMuteState() {
    try {
      const saved = localStorage.getItem('SIH_2026_SOUND_MUTED');
      if (saved !== null) {
        isMuted = saved === 'true';
      } else {
        isMuted = false;
      }
    } catch (e) {
      isMuted = false;
    }
    return isMuted;
  }

  function unlockAudioContext() {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  // Preload audio buffer immediately
  function preloadLaunchAudio() {
    try {
      fetch('/hackathon-launch.wav')
        .then(res => {
          if (!res.ok) return fetch('hackathon-launch.wav');
          return res;
        })
        .then(res => res.arrayBuffer())
        .then(data => {
          const ctx = getAudioContext();
          if (ctx) {
            ctx.decodeAudioData(data, buffer => {
              launchAudioBuffer = buffer;
            });
          }
        })
        .catch(() => {});
    } catch (e) {}
  }

  // Attach global unlock listeners
  window.addEventListener('pointerdown', unlockAudioContext, { once: true });
  window.addEventListener('keydown', unlockAudioContext, { once: true });

  function playClickSound() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  function playLaunchCeremonySound() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (launchAudioBuffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = launchAudioBuffer;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.75, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
      } catch (e) {}
    }

    const now = ctx.currentTime;

    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    subGain.gain.setValueAtTime(0.35, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.6);

    const whooshOsc = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    whooshOsc.type = 'sawtooth';
    whooshOsc.frequency.setValueAtTime(120, now + 0.08);
    whooshOsc.frequency.exponentialRampToValueAtTime(1400, now + 0.40);
    whooshGain.gain.setValueAtTime(0.01, now + 0.08);
    whooshGain.gain.linearRampToValueAtTime(0.22, now + 0.35);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    whooshOsc.connect(whooshGain);
    whooshGain.connect(ctx.destination);
    whooshOsc.start(now + 0.08);
    whooshOsc.stop(now + 0.45);

    const chordFreqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    chordFreqs.forEach((freq, idx) => {
      const brassOsc = ctx.createOscillator();
      const brassGain = ctx.createGain();
      brassOsc.type = idx % 2 === 0 ? 'triangle' : 'sawtooth';
      brassOsc.frequency.setValueAtTime(freq, now + 0.32);

      brassGain.gain.setValueAtTime(0.001, now + 0.32);
      brassGain.gain.linearRampToValueAtTime(0.12, now + 0.35);
      brassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      brassOsc.connect(brassGain);
      brassGain.connect(ctx.destination);
      brassOsc.start(now + 0.32);
      brassOsc.stop(now + 1.8);
    });

    const shimmerNotes = [1046.50, 1318.51, 1567.98, 2093.00, 2637.02];
    shimmerNotes.forEach((freq, idx) => {
      const shimOsc = ctx.createOscillator();
      const shimGain = ctx.createGain();
      shimOsc.type = 'sine';
      shimOsc.frequency.setValueAtTime(freq, now + 0.48 + idx * 0.06);

      shimGain.gain.setValueAtTime(0, now + 0.48 + idx * 0.06);
      shimGain.gain.linearRampToValueAtTime(0.08, now + 0.48 + idx * 0.06 + 0.02);
      shimGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48 + idx * 0.06 + 0.6);

      shimOsc.connect(shimGain);
      shimGain.connect(ctx.destination);
      shimOsc.start(now + 0.48 + idx * 0.06);
      shimOsc.stop(now + 0.48 + idx * 0.06 + 0.6);
    });
  }

  // 5. Short Professional Attention Chime for Live Event Announcements
  function playAnnouncementChime(priority = 'NORMAL') {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Soft low impact base
    const baseOsc = ctx.createOscillator();
    const baseGain = ctx.createGain();
    baseOsc.type = 'sine';
    baseOsc.frequency.setValueAtTime(130, now);
    baseOsc.frequency.exponentialRampToValueAtTime(65, now + 0.4);
    baseGain.gain.setValueAtTime(0.2, now);
    baseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    baseOsc.connect(baseGain);
    baseGain.connect(ctx.destination);
    baseOsc.start(now);
    baseOsc.stop(now + 0.4);

    // Chime notes based on priority
    let notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    if (priority === 'IMPORTANT') {
      notes = [523.25, 659.25, 783.99, 1046.50];
    } else if (priority === 'URGENT') {
      notes = [659.25, 783.99, 1046.50, 1318.51];
    }

    notes.forEach((freq, idx) => {
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, now + 0.1 + idx * 0.12);

      chimeGain.gain.setValueAtTime(0, now + 0.1 + idx * 0.12);
      chimeGain.gain.linearRampToValueAtTime(0.18, now + 0.1 + idx * 0.12 + 0.03);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + idx * 0.12 + 1.2);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);

      chimeOsc.start(now + 0.1 + idx * 0.12);
      chimeOsc.stop(now + 0.1 + idx * 0.12 + 1.2);
    });
  }

  function playTickSound() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  function playVictoryFanfare() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);

      gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + index * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.12 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + index * 0.12);
      osc.stop(ctx.currentTime + index * 0.12 + 0.8);
    });
  }

  // ==========================================================================
  // CENTRAL AUDIO MANIFEST & PRELOADED AUDIO REGISTRY
  // ==========================================================================
  const audioRegistry = {}; // filename -> HTMLAudioElement
  const NOTIFICATION_AUDIO_MANIFEST = {};
  let currentAnnouncementAudio = null;
  let activeAudioFilename = null;
  let fadeInterval = null;
  let announcementStopTimeout = null;
  let previewAudioInstance = null;

  function preloadAudioFile(filename) {
    if (!filename || filename === '' || filename === 'none') return null;
    if (audioRegistry[filename]) return audioRegistry[filename];

    try {
      const encodedFilename = encodeURIComponent(filename);
      const audioUrl = `/Music/${encodedFilename}`;
      NOTIFICATION_AUDIO_MANIFEST[filename] = audioUrl;

      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audio.load();

      audioRegistry[filename] = audio;
      console.log(`[AUDIO ENGINE] Cached & preloaded track: ${filename}`);
      return audio;
    } catch (e) {
      console.warn(`[AUDIO ENGINE] Failed to preload audio track ${filename}:`, e);
      return null;
    }
  }

  async function preloadAllMusic(musicList) {
    const tStart = performance.now();
    try {
      let filesToPreload = musicList;
      if (!filesToPreload || filesToPreload.length === 0) {
        const DEFAULT_RENDER_URL = 'https://sihcountdownveltech.onrender.com';
        const API_BASE_URL = window.API_BASE_URL ||
          (window.location.hostname.includes('vercel.app') ? DEFAULT_RENDER_URL : '');
        const res = await fetch(`${API_BASE_URL}/api/music/list`);
        if (res.ok) {
          const data = await res.json();
          filesToPreload = data.music || [];
        }
      }

      if (Array.isArray(filesToPreload)) {
        filesToPreload.forEach(item => {
          const filename = typeof item === 'object' ? item.filename : item;
          if (filename && filename !== '' && filename !== 'none') {
            preloadAudioFile(filename);
          }
        });
      }
      console.log(`[AUDIO ENGINE] Preload complete in ${(performance.now() - tStart).toFixed(2)}ms.`);
    } catch (e) {
      console.warn('[AUDIO ENGINE] Error during background music preloading:', e);
    }
  }

  function getAudioDuration(filename) {
    if (!filename) return 0;
    const audio = audioRegistry[filename];
    if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      return audio.duration;
    }
    return 0;
  }

  function stopAnnouncementMusic(fadeSeconds = 0) {
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
    if (announcementStopTimeout) {
      clearTimeout(announcementStopTimeout);
      announcementStopTimeout = null;
    }

    const audioToStop = currentAnnouncementAudio;
    currentAnnouncementAudio = null;
    activeAudioFilename = null;

    if (audioToStop) {
      try {
        audioToStop.pause();
        audioToStop.currentTime = 0;
        audioToStop.src = '';
      } catch (e) {}
    }

    Object.values(audioRegistry).forEach(a => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch (e) {}
    });
  }

  function playAnnouncementMusic(filename, loop = false, seekSeconds = 0, durationSeconds = 0, onEndedCallback = null) {
    console.log(`[AUDIO ENGINE] Play requested: ${filename}, seek: ${seekSeconds}s, duration: ${durationSeconds}s`);

    // Kill any existing playback immediately
    stopAnnouncementMusic(0);

    if (isMuted) {
      console.log(`[AUDIO ENGINE] Audio play skipped (Sound is MUTED)`);
      return;
    }

    if (!filename || filename === '' || filename === 'none') {
      console.log(`[AUDIO ENGINE] Audio play skipped (None - No Sound selected)`);
      return;
    }

    if (durationSeconds > 0 && seekSeconds >= durationSeconds) {
      console.log(`[AUDIO ENGINE] Audio play skipped (Expired on server timeline)`);
      return;
    }

    const encodedFilename = encodeURIComponent(filename);
    const DEFAULT_RENDER_URL = 'https://sihcountdownveltech.onrender.com';
    const API_BASE_URL = window.API_BASE_URL ||
      (window.location.hostname.includes('vercel.app') ? DEFAULT_RENDER_URL : '');
    const audioUrl = `${API_BASE_URL}/Music/${encodedFilename}`;
    
    const audio = new Audio(audioUrl);

    currentAnnouncementAudio = audio;
    activeAudioFilename = filename;

    audio.loop = !!loop;
    audio.volume = 1.0;

    if (seekSeconds > 0) {
      const applySeek = () => {
        try {
          if (audio.duration && seekSeconds < audio.duration) {
            audio.currentTime = seekSeconds;
          } else if (!audio.duration) {
            audio.currentTime = seekSeconds;
          }
        } catch (e) {}
      };
      if (audio.readyState >= 1) {
        applySeek();
      } else {
        audio.addEventListener('loadedmetadata', applySeek, { once: true });
      }
    }

    if (onEndedCallback) {
      audio.onended = onEndedCallback;
    }

    // Hard End Safety Timeout
    if (durationSeconds > 0) {
      const remainingMs = Math.max(0, (durationSeconds - seekSeconds) * 1000);
      announcementStopTimeout = setTimeout(() => {
        console.log(`[AUDIO ENGINE] Hard end safety timeout fired for ${filename}`);
        stopAnnouncementMusic(0);
      }, remainingMs);
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log(`[AUDIO ENGINE] Audio playing: ${filename}`);
        if (currentAnnouncementAudio !== audio) {
          console.log(`[AUDIO ENGINE] Announcement ended while audio promise resolved. Stopping immediately.`);
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
        }
      }).catch(err => {
        console.warn('[AUDIO ENGINE] Audio playback blocked by browser policy:', err);
        const resumeOnInteraction = () => {
          if (currentAnnouncementAudio === audio && audio.paused) {
            audio.play().catch(() => {});
          }
          window.removeEventListener('pointerdown', resumeOnInteraction);
          window.removeEventListener('keydown', resumeOnInteraction);
        };
        window.addEventListener('pointerdown', resumeOnInteraction, { once: true });
        window.addEventListener('keydown', resumeOnInteraction, { once: true });
      });
    }
  }

  // Local Admin Audio Preview (Plays ONLY on admin device)
  function playPreview(filename, loop = false, onEndedCallback = null) {
    stopPreview();
    if (!filename || filename === '' || filename === 'none') return;

    let audio = audioRegistry[filename];
    if (!audio) {
      audio = preloadAudioFile(filename);
    }

    if (!audio) return;

    previewAudioInstance = audio;
    audio.loop = !!loop;
    audio.volume = 1.0;
    audio.currentTime = 0;

    if (onEndedCallback) {
      audio.onended = onEndedCallback;
    }

    audio.play().catch(err => {
      console.warn('[AUDIO ENGINE] Preview audio playback failed:', err);
    });
  }

  function stopPreview() {
    if (previewAudioInstance) {
      try {
        previewAudioInstance.pause();
        previewAudioInstance.currentTime = 0;
      } catch (e) {}
      previewAudioInstance = null;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    preloadLaunchAudio();
    // Trigger background preloading of all notification music on page load
    preloadAllMusic();
  });

  window.AudioEngine = {
    setMuted,
    loadMuteState,
    playClickSound,
    playLaunchCeremonySound,
    playAnnouncementChime,
    playAnnouncementMusic,
    stopAnnouncementMusic,
    playTickSound,
    playVictoryFanfare,
    preloadAllMusic,
    preloadAudioFile,
    getAudioDuration,
    playPreview,
    stopPreview,
    isMuted: () => isMuted
  };
})();

