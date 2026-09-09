/* ==========================================================================
   SIH 2026 - CINEMATIC BACKGROUND CANVAS ENGINE
   Ambient tech particles, constellation mesh, & slow orbital glows.
   ========================================================================== */

(function () {
  'use strict';

  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let particles = [];
  let lightBeams = [];
  let animFrameId = null;

  // Particle configuration
  const PARTICLE_COUNT = 70;
  const MAX_DISTANCE = 130;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = randomRange(-0.35, 0.35);
      this.vy = randomRange(-0.35, 0.35);
      this.radius = randomRange(1.2, 2.8);
      this.alpha = randomRange(0.2, 0.8);
      this.baseAlpha = this.alpha;
      this.pulseSpeed = randomRange(0.005, 0.02);
      this.pulseAngle = Math.random() * Math.PI * 2;

      // Colors: Cyan (#00f2fe), Violet (#7928ca), Soft White
      const colorChoices = ['0, 242, 254', '121, 40, 202', '255, 255, 255', '79, 70, 229'];
      this.rgb = colorChoices[Math.floor(Math.random() * colorChoices.length)];
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Wrap around screen boundaries
      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;

      // Alpha pulse
      this.pulseAngle += this.pulseSpeed;
      this.alpha = this.baseAlpha + Math.sin(this.pulseAngle) * 0.2;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.rgb}, ${Math.max(0, this.alpha)})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgba(${this.rgb}, 0.8)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  class LightBeam {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.radius = randomRange(250, 450);
      this.angle = Math.random() * Math.PI * 2;
      this.speed = randomRange(0.001, 0.003);
      this.color = Math.random() > 0.5 ? '0, 242, 254' : '121, 40, 202';
    }

    update() {
      this.angle += this.speed;
      this.x = width / 2 + Math.cos(this.angle) * (width * 0.25);
      this.y = height / 2 + Math.sin(this.angle * 0.8) * (height * 0.2);
    }

    draw() {
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
      grad.addColorStop(0, `rgba(${this.color}, 0.12)`);
      grad.addColorStop(0.5, `rgba(${this.color}, 0.04)`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }

    lightBeams = [new LightBeam(), new LightBeam(), new LightBeam()];
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_DISTANCE) {
          const alpha = (1 - dist / MAX_DISTANCE) * 0.25;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 80;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Draw ambient background elements
    drawGrid();

    // Render light beams
    lightBeams.forEach(beam => {
      beam.update();
      beam.draw();
    });

    // Render particles and constellation lines
    drawConnections();
    particles.forEach(p => {
      p.update();
      p.draw();
    });

    animFrameId = requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);
  resize();
  render();

  // Expose global controller
  window.BackgroundEngine = {
    stop: () => cancelAnimationFrame(animFrameId),
    start: () => render()
  };
})();
