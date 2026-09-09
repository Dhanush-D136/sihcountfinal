/* ==========================================================================
   SIH 2026 - LAUNCH CEREMONY & FIREWORKS FX ENGINE
   Physics-based particles, confetti, light bursts, & celebratory fireworks.
   ========================================================================== */

(function () {
  'use strict';

  const canvas = document.getElementById('fxCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let particles = [];
  let fireworks = [];
  let isRunning = false;
  let animFrameId = null;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  // 1. Confetti & Spark Particles
  class FXParticle {
    constructor(x, y, type = 'confetti', color) {
      this.x = x;
      this.y = y;
      this.type = type; // 'confetti', 'rising-spark', 'geometric', 'firework-spark'
      
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'firework-spark' ? randomRange(4, 12) : randomRange(5, 18);
      
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      
      if (type === 'rising-spark') {
        this.vx = randomRange(-2, 2);
        this.vy = randomRange(-8, -16);
      } else if (type === 'confetti') {
        this.vy -= randomRange(2, 6);
      }

      this.gravity = type === 'rising-spark' ? -0.1 : (type === 'firework-spark' ? 0.25 : 0.4);
      this.drag = 0.96;
      this.alpha = 1;
      this.decay = randomRange(0.008, 0.025);
      this.rotation = Math.random() * Math.PI * 2;
      this.vRot = randomRange(-0.2, 0.2);
      this.size = randomRange(4, 10);

      // Color selection
      const colors = ['#00f2fe', '#4facfe', '#7928ca', '#ff0080', '#fbbf24', '#ffffff', '#10b981'];
      this.color = color || colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
      this.vx *= this.drag;
      this.vy *= this.drag;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;

      this.rotation += this.vRot;
      this.alpha -= this.decay;
    }

    draw() {
      if (this.alpha <= 0) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = Math.max(0, this.alpha);

      if (this.type === 'confetti') {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 1.5);
      } else if (this.type === 'geometric') {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Draw small tech hexagon or square
        ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.stroke();
      } else {
        // Glowing Spark
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // 2. Rocket Firework
  class Firework {
    constructor() {
      this.x = randomRange(width * 0.15, width * 0.85);
      this.y = height;
      this.targetY = randomRange(height * 0.15, height * 0.5);
      this.speed = randomRange(12, 18);
      this.angle = -Math.PI / 2 + randomRange(-0.2, 0.2);
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      this.exploded = false;
      const colors = ['#00f2fe', '#7928ca', '#ff0080', '#fbbf24', '#ffffff'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
      if (!this.exploded) {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // slight gravity

        if (this.vy >= 0 || this.y <= this.targetY) {
          this.explode();
        }
      }
    }

    explode() {
      this.exploded = true;
      const sparkCount = randomRange(40, 70);
      for (let i = 0; i < sparkCount; i++) {
        particles.push(new FXParticle(this.x, this.y, 'firework-spark', this.color));
      }
    }

    draw() {
      if (!this.exploded) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function renderLoop() {
    ctx.clearRect(0, 0, width, height);

    // Update fireworks rockets
    for (let i = fireworks.length - 1; i >= 0; i--) {
      fireworks[i].update();
      fireworks[i].draw();
      if (fireworks[i].exploded) {
        fireworks.splice(i, 1);
      }
    }

    // Update FX Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      if (particles[i].alpha <= 0) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0 || fireworks.length > 0 || isRunning) {
      animFrameId = requestAnimationFrame(renderLoop);
    } else {
      isRunning = false;
    }
  }

  function ensureAnimation() {
    if (!isRunning) {
      isRunning = true;
      renderLoop();
    }
  }

  // PUBLIC LAUNCH ANIMATION METHODS
  function triggerLaunchCeremony(onComplete) {
    ensureAnimation();

    // 1. Multi-directional Cannon Burst
    const originLeft = { x: width * 0.1, y: height * 0.8 };
    const originRight = { x: width * 0.9, y: height * 0.8 };
    const originCenter = { x: width * 0.5, y: height * 0.5 };

    // Spawn Confetti cannons
    for (let i = 0; i < 120; i++) {
      particles.push(new FXParticle(originLeft.x, originLeft.y, 'confetti'));
      particles.push(new FXParticle(originRight.x, originRight.y, 'confetti'));
    }

    // Spawn Geometric tech particles from center
    for (let i = 0; i < 60; i++) {
      particles.push(new FXParticle(originCenter.x, originCenter.y, 'geometric'));
    }

    // Spawn Rising Sparks
    for (let i = 0; i < 80; i++) {
      particles.push(new FXParticle(randomRange(0, width), height, 'rising-spark'));
    }

    // Launch Fireworks
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        fireworks.push(new Firework());
        ensureAnimation();
      }, i * 300);
    }

    // Trigger Screen Flash
    const flash = document.getElementById('flashOverlay');
    if (flash) {
      setTimeout(() => {
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 500);
      }, 1800);
    }

    // Callback when ceremony finishes transition (e.g. at 2.5 seconds)
    if (typeof onComplete === 'function') {
      setTimeout(onComplete, 2200);
    }
  }

  function triggerFireworksBurst() {
    ensureAnimation();
    for (let i = 0; i < 4; i++) {
      fireworks.push(new Firework());
    }
  }

  function triggerCompletionCeremony() {
    ensureAnimation();

    // Grand Finale Continuous Burst
    let burstCount = 0;
    const interval = setInterval(() => {
      triggerFireworksBurst();
      for (let i = 0; i < 40; i++) {
        particles.push(new FXParticle(randomRange(0, width), randomRange(0, height * 0.6), 'confetti'));
      }
      burstCount++;
      if (burstCount > 10) clearInterval(interval);
    }, 400);

    const flash = document.getElementById('flashOverlay');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 700);
    }
  }

  window.addEventListener('resize', resize);
  resize();

  // Expose global interface
  window.FXEngine = {
    triggerLaunchCeremony,
    triggerFireworksBurst,
    triggerCompletionCeremony
  };
})();
