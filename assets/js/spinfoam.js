document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("spinfoamCanvas");
  if (!canvas) return;

  const hero = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let width = 1;
  let height = 1;
  let dpr = 1;
  let config;
  let nodes = [];
  let bridges = [];
  let globalTime = 0;
  let animationFrame = null;
  let resizeFrame = null;
  let isInView = true;
  let reducedMotion = reducedMotionQuery.matches;

  const mouse = { x: null, y: null };

  function makeConfig() {
    const isMobile = window.innerWidth < 768;
    return {
      numNodes: isMobile ? 180 : 650,
      maxDistance: isMobile ? 145 : 120,
      mouseRadius: isMobile ? 120 : 180,
      mouseForce: 1.5,
      colorTeal: { r: 0, g: 168, b: 168 },
      colorFushia: { r: 255, g: 0, b: 150 },
      waveSpeed: 0.005,
      waveFreq: 0.003,
      maxFushiaRatio: 0.45,
      fluctuationRate: 0.01,
      fadeSmoothness: 2.5,
      fadeOffset: 0.2,
      probBridge: 0.05,
      maxBridges: isMobile ? 5 : 12,
      bridgeLife: 150
    };
  }

  function createNode() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      baseRadius: Math.random() * 2 + 0.5,
      kinematicPhase: Math.random() * Math.PI * 2,
      existencePhase: Math.random() * Math.PI * 2,
      amplitude: 1,
      colorRatio: 0
    };
  }

  function rebuildNodes() {
    nodes = Array.from({ length: config.numNodes }, createNode);
    bridges = [];
  }

  function resizeCanvas() {
    config = makeConfig();

    const rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(hero.offsetHeight));
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (nodes.length !== config.numNodes) {
      rebuildNodes();
    } else {
      nodes.forEach((node) => {
        node.x = Math.min(Math.max(node.x, 0), width);
        node.y = Math.min(Math.max(node.y, 0), height);
      });
    }

    drawFrame(false);
  }

  function getMixedColor(ratio, alpha) {
    const r = Math.round(config.colorTeal.r * (1 - ratio) + config.colorFushia.r * ratio);
    const g = Math.round(config.colorTeal.g * (1 - ratio) + config.colorFushia.g * ratio);
    const b = Math.round(config.colorTeal.b * (1 - ratio) + config.colorFushia.b * ratio);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function updateNodes() {
    globalTime += config.waveSpeed;
    const mouseRadiusSq = config.mouseRadius * config.mouseRadius;

    nodes.forEach((node) => {
      node.kinematicPhase += 0.02;
      node.existencePhase += config.fluctuationRate;

      const rawSine = Math.sin(node.existencePhase);
      node.amplitude = Math.max(
        0,
        Math.min(1, (rawSine + config.fadeOffset) * config.fadeSmoothness)
      );

      const waveX = Math.sin(node.x * config.waveFreq + globalTime);
      const waveY = Math.cos(node.y * config.waveFreq + globalTime * 0.8);
      node.colorRatio = Math.max(0, (waveX + waveY) * 0.5) * config.maxFushiaRatio;

      node.x += node.vx + Math.sin(node.kinematicPhase) * 0.1;
      node.y += node.vy + Math.cos(node.kinematicPhase) * 0.1;

      if (node.x < 0) {
        node.x = 0;
        node.vx = Math.abs(node.vx);
      } else if (node.x > width) {
        node.x = width;
        node.vx = -Math.abs(node.vx);
      }

      if (node.y < 0) {
        node.y = 0;
        node.vy = Math.abs(node.vy);
      } else if (node.y > height) {
        node.y = height;
        node.vy = -Math.abs(node.vy);
      }

      if (mouse.x !== null && mouse.y !== null) {
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > 0.0001 && distSq < mouseRadiusSq) {
          const dist = Math.sqrt(distSq);
          const force = (config.mouseRadius - dist) / config.mouseRadius;
          node.x += (dx / dist) * force * config.mouseForce;
          node.y += (dy / dist) * force * config.mouseForce;
        }
      }
    });
  }

  function updateAndDrawBridges() {
    const maxDistSq = config.maxDistance * config.maxDistance;

    if (Math.random() < config.probBridge && bridges.length < config.maxBridges) {
      const n1 = nodes[Math.floor(Math.random() * nodes.length)];
      const n2 = nodes[Math.floor(Math.random() * nodes.length)];

      if (n1 !== n2 && n1.amplitude > 0.9 && n2.amplitude > 0.9) {
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        if (dx * dx + dy * dy > maxDistSq) {
          bridges.push({ n1, n2, life: config.bridgeLife, maxLife: config.bridgeLife });
        }
      }
    }

    for (let i = bridges.length - 1; i >= 0; i -= 1) {
      const bridge = bridges[i];
      bridge.life -= 1;

      if (bridge.life <= 0 || bridge.n1.amplitude < 0.1 || bridge.n2.amplitude < 0.1) {
        bridges.splice(i, 1);
        continue;
      }

      const timeAmplitude = Math.sin((bridge.life / bridge.maxLife) * Math.PI);
      const avgColorRatio = (bridge.n1.colorRatio + bridge.n2.colorRatio) / 2;
      const finalAlpha = timeAmplitude * 0.6 * bridge.n1.amplitude * bridge.n2.amplitude;

      ctx.beginPath();
      ctx.moveTo(bridge.n1.x, bridge.n1.y);
      ctx.lineTo(bridge.n2.x, bridge.n2.y);
      ctx.strokeStyle = getMixedColor(avgColorRatio, finalAlpha);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function buildSpatialGrid() {
    const grid = new Map();
    const cellSize = config.maxDistance;

    nodes.forEach((node, index) => {
      if (node.amplitude < 0.01) return;

      const cx = Math.floor(node.x / cellSize);
      const cy = Math.floor(node.y / cellSize);
      const key = `${cx},${cy}`;

      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(index);
    });

    return { grid, cellSize };
  }

  function drawLocalNetwork() {
    const maxDistSq = config.maxDistance * config.maxDistance;
    const { grid, cellSize } = buildSpatialGrid();

    nodes.forEach((node, i) => {
      if (node.amplitude < 0.01) return;

      const cx = Math.floor(node.x / cellSize);
      const cy = Math.floor(node.y / cellSize);

      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oy = -1; oy <= 1; oy += 1) {
          const candidates = grid.get(`${cx + ox},${cy + oy}`);
          if (!candidates) continue;

          candidates.forEach((j) => {
            if (j <= i) return;
            const other = nodes[j];

            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const distSq = dx * dx + dy * dy;
            if (distSq >= maxDistSq) return;

            const dist = Math.sqrt(distSq);
            const distanceAlpha = (1 - dist / config.maxDistance) * 0.4;
            const jointAmplitude = node.amplitude * other.amplitude;
            const finalAlpha = distanceAlpha * jointAmplitude;
            const thickness = (Math.sin(node.kinematicPhase + j) + 1.5) * 1.0;
            const avgColorRatio = (node.colorRatio + other.colorRatio) / 2;

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = getMixedColor(avgColorRatio, finalAlpha);
            ctx.lineWidth = thickness;
            ctx.stroke();
          });
        }
      }
    });
  }

  function drawNodes() {
    nodes.forEach((node) => {
      if (node.amplitude < 0.01) return;

      ctx.beginPath();
      ctx.arc(
        node.x,
        node.y,
        node.baseRadius + Math.sin(node.kinematicPhase) * 0.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = getMixedColor(node.colorRatio, node.amplitude * 0.9);
      ctx.fill();
    });
  }

  function drawFrame(advance = true) {
    ctx.clearRect(0, 0, width, height);

    if (advance) updateNodes();
    updateAndDrawBridges();
    drawLocalNetwork();
    drawNodes();
  }

  function shouldAnimate() {
    return !reducedMotion && isInView && !document.hidden;
  }

  function animate() {
    animationFrame = null;
    if (!shouldAnimate()) return;

    drawFrame(true);
    animationFrame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    if (shouldAnimate()) {
      if (animationFrame === null) animationFrame = requestAnimationFrame(animate);
    } else {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      drawFrame(false);
    }
  }

  window.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const withinCanvas =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (withinCanvas) {
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    } else {
      mouse.x = null;
      mouse.y = null;
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      resizeCanvas();
      syncAnimation();
    });
  }, { passive: true });

  document.addEventListener("visibilitychange", syncAnimation);

  const onReducedMotionChange = (event) => {
    reducedMotion = event.matches;
    syncAnimation();
  };

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", onReducedMotionChange);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    reducedMotionQuery.addListener(onReducedMotionChange);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        isInView = entries[0]?.isIntersecting ?? true;
        syncAnimation();
      },
      { threshold: 0.02 }
    );
    observer.observe(hero);
  }

  config = makeConfig();
  rebuildNodes();
  resizeCanvas();
  syncAnimation();
});
