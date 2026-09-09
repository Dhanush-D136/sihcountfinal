/* ==========================================================================
   SIH 2026 - AUDIO SYNTHESIZER & EVENT ANNOUNCEMENT CHIME ENGINE
   Zero-dependency Web Audio API sound engine with inauguration & announcement chimes.
   ========================================================================== */

(function () {
  'use strict';

  let audioCtx = null;
  let isMuted = true;
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
      }
    } catch (e) {}
    return isMuted;
  }

  function preloadLaunchAudio() {
    try {
      fetch('hackathon-launch.wav')
        .then(res => {
          if (!res.ok) return fetch('public/audio/hackathon-launch.wav');
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

  let currentAnnouncementAudio = null;
  let fadeInterval = null;

  function playAnnouncementMusic(filename, loop = false, seekSeconds = 0, onEndedCallback = null) {
    if (isMuted) return;
    if (!filename) return;

    const encodedFilename = encodeURIComponent(filename);
    if (currentAnnouncementAudio && currentAnnouncementAudio.src.includes(encodedFilename)) {
      if (currentAnnouncementAudio.paused) {
        currentAnnouncementAudio.play().catch(() => {});
      }
      return;
    }

    stopAnnouncementMusic(0);

    const audioUrl = `/Music/${encodedFilename}`;
    currentAnnouncementAudio = new Audio(audioUrl);
    currentAnnouncementAudio.loop = !!loop;
    currentAnnouncementAudio.volume = 1.0;

    currentAnnouncementAudio.addEventListener('loadedmetadata', () => {
      if (seekSeconds > 0 && seekSeconds < currentAnnouncementAudio.duration) {
        currentAnnouncementAudio.currentTime = seekSeconds;
      }
    });

    if (onEndedCallback) {
      currentAnnouncementAudio.onended = onEndedCallback;
    }

    currentAnnouncementAudio.play().catch(err => {
      console.warn('Public announcement music playback blocked by browser policy:', err);
    });
  }

  function stopAnnouncementMusic(fadeSeconds = 0.8) {
    if (fadeInterval) clearInterval(fadeInterval);
    if (!currentAnnouncementAudio) return;

    const audioToStop = currentAnnouncementAudio;
    currentAnnouncementAudio = null;

    if (fadeSeconds > 0 && !audioToStop.paused && audioToStop.volume > 0.05) {
      const fadeSteps = 16;
      const intervalMs = (fadeSeconds * 1000) / fadeSteps;
      const volStep = audioToStop.volume / fadeSteps;

      fadeInterval = setInterval(() => {
        try {
          if (audioToStop.volume > volStep) {
            audioToStop.volume = Math.max(0, audioToStop.volume - volStep);
          } else {
            clearInterval(fadeInterval);
            audioToStop.pause();
            audioToStop.currentTime = 0;
          }
        } catch (e) {
          clearInterval(fadeInterval);
        }
      }, intervalMs);
    } else {
      try {
        audioToStop.pause();
        audioToStop.currentTime = 0;
      } catch (e) {}
    }
  }

  document.addEventListener('DOMContentLoaded', preloadLaunchAudio);

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
    isMuted: () => isMuted
  };
})();
