(() => {
  "use strict";

  const root = document.getElementById("sm-floating-app");
  if (!root) return;

  const elements = {
    stage: root.querySelector("#sm-floating-stage"),
    field: root.querySelector("#sm-floating-field"),
    loading: root.querySelector("#sm-floating-loading"),
    level: root.querySelector("#sm-floating-level"),
    count: root.querySelector("#sm-floating-count"),
    motion: root.querySelector("#sm-floating-motion"),
    speed: root.querySelector("#sm-floating-speed"),
  };

  const REQUIRED_SCHEMA = 2;
  const TYPESET_BATCH = 72;
  const SAMPLE_SPACING = 7;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(window.location.search);
  const levelParam = params.get("level");
  const maskParam = params.get("mask");

  const state = {
    catalogue: null,
    phase: params.get("phase") || "unbroken",
    level: levelParam === null ? 2 : Number(levelParam),
    mask: maskParam === null ? Number.NaN : Number(maskParam),
    colour: params.get("colour") === "1",
    terms: [],
    nodes: [],
    offsets: [],
    totalLength: 1,
    ready: false,
    motion: !prefersReducedMotion,
    speed: 0.8,
    pointerActive: false,
    pointerX: 0,
    pointerY: 0,
    headX: 0,
    headY: 0,
    velocityX: 0,
    velocityY: 0,
    history: [],
    travelled: 0,
    lastFrame: performance.now(),
    resizeTimer: 0,
    seed: Math.random() * 1000,
  };

  function signedBody(term, index, semantic = false) {
    const body = semantic && term.semanticBody ? term.semanticBody : term.body;
    if (index === 0) {
      const sign = term.sign < 0 ? "-" : "";
      return String.raw`\mathcal{L}_{\mathrm{selected}} ={} ${sign}\,${body}`;
    }
    return `${term.sign < 0 ? "-" : "+"}\\;${body}`;
  }

  async function waitForMathJax() {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      if (window.MathJax?.typesetPromise) return window.MathJax;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    throw new Error("MathJax did not become available.");
  }

  async function loadCatalogue() {
    const base = root.dataset.catalogue;
    const separator = base.includes("?") ? "&" : "?";
    const response = await fetch(`${base}${separator}schema=${REQUIRED_SCHEMA}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
    const data = await response.json();
    if (!data || data.schemaVersion !== REQUIRED_SCHEMA || !data.phases || !data.configurations || !Array.isArray(data.terms)) {
      throw new Error("Incompatible Lagrangian catalogue.");
    }
    return data;
  }

  function validateSelection() {
    if (!state.catalogue.phases[state.phase]) state.phase = "unbroken";
    const phase = state.catalogue.phases[state.phase];
    if (!Number.isInteger(state.level) || state.level < 0 || state.level >= state.catalogue.levels.length) state.level = 2;
    if (!Number.isInteger(state.mask) || state.mask < 0 || state.mask > phase.allMask) state.mask = phase.allMask;
  }

  function buildEquation(useSemantic) {
    elements.field.replaceChildren();
    const fragment = document.createDocumentFragment();
    if (!state.terms.length) {
      const empty = document.createElement("span");
      empty.className = "sm-floating-term";
      empty.textContent = String.raw`\(\mathcal{L}_{\mathrm{selected}}=0\)`;
      fragment.append(empty);
    } else {
      state.terms.forEach((term, index) => {
        const wrapper = document.createElement("span");
        wrapper.className = `sm-floating-term sm-sector--${term.sector}`;
        wrapper.dataset.index = String(index);
        wrapper.style.setProperty("--sm-hue-drift", `${((index * 17) % 19) - 9}deg`);
        wrapper.textContent = `\\(${signedBody(term, index, useSemantic)}\\)`;
        fragment.append(wrapper);
      });
    }
    elements.field.append(fragment);
  }

  async function typesetEquation() {
    const mathJax = await waitForMathJax();
    const trySemantic = state.colour;

    async function run(useSemantic) {
      if (mathJax.typesetClear) mathJax.typesetClear([elements.field]);
      buildEquation(useSemantic);
      const nodes = [...elements.field.children];
      for (let start = 0; start < nodes.length; start += TYPESET_BATCH) {
        await mathJax.typesetPromise(nodes.slice(start, start + TYPESET_BATCH));
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    }

    try {
      await run(trySemantic);
    } catch (error) {
      if (!trySemantic) throw error;
      console.warn("Semantic floating rendering failed; using plain TeX.", error);
      state.colour = false;
      root.classList.remove("is-colour-mode");
      await run(false);
    }
  }

  function measureRibbon() {
    state.nodes = [...elements.field.querySelectorAll(".sm-floating-term")];
    state.offsets = [];
    let cursor = 0;
    const gap = Math.max(18, Math.min(38, window.innerWidth * 0.019));
    state.nodes.forEach((node) => {
      const width = Math.max(42, node.getBoundingClientRect().width);
      state.offsets.push(cursor + width / 2);
      cursor += width + gap;
    });
    state.totalLength = Math.max(cursor, 1);
    trimHistory();
  }

  function trimHistory() {
    const keep = state.totalLength + Math.max(elements.stage.clientWidth, elements.stage.clientHeight) * 2.4;
    while (state.history.length > 3 && state.travelled - state.history[0].s > keep) {
      state.history.shift();
    }
  }

  function randomTarget(now) {
    const w = elements.stage.clientWidth;
    const h = elements.stage.clientHeight;
    const t = now * 0.00013 * (0.75 + state.speed * 0.35) + state.seed;
    const x = w * (0.5 + 0.34 * Math.sin(t * 1.17) + 0.08 * Math.sin(t * 2.73 + 1.8));
    const y = h * (0.54 + 0.28 * Math.sin(t * 0.83 + 1.1) + 0.08 * Math.cos(t * 2.11));
    return {
      x: Math.max(w * 0.1, Math.min(w * 0.9, x)),
      y: Math.max(h * 0.16, Math.min(h * 0.9, y)),
    };
  }

  function advanceHead(now) {
    const dt = Math.min(34, Math.max(1, now - state.lastFrame));
    state.lastFrame = now;
    if (!state.motion) return;

    const target = state.pointerActive
      ? { x: state.pointerX, y: state.pointerY }
      : randomTarget(now);

    const dx = target.x - state.headX;
    const dy = target.y - state.headY;
    const distance = Math.hypot(dx, dy) || 1;
    const desiredSpeed = (0.045 + state.speed * 0.055) * dt;
    const desiredVX = dx / distance * desiredSpeed;
    const desiredVY = dy / distance * desiredSpeed;
    const steering = state.pointerActive ? 0.075 : 0.026;

    state.velocityX += (desiredVX - state.velocityX) * steering;
    state.velocityY += (desiredVY - state.velocityY) * steering;

    const oldX = state.headX;
    const oldY = state.headY;
    state.headX += state.velocityX;
    state.headY += state.velocityY;

    const marginX = elements.stage.clientWidth * 0.07;
    const marginTop = Math.max(92, elements.stage.clientHeight * 0.08);
    const marginBottom = elements.stage.clientHeight * 0.06;
    if (state.headX < marginX || state.headX > elements.stage.clientWidth - marginX) state.velocityX *= -0.86;
    if (state.headY < marginTop || state.headY > elements.stage.clientHeight - marginBottom) state.velocityY *= -0.86;
    state.headX = Math.max(marginX, Math.min(elements.stage.clientWidth - marginX, state.headX));
    state.headY = Math.max(marginTop, Math.min(elements.stage.clientHeight - marginBottom, state.headY));

    const step = Math.hypot(state.headX - oldX, state.headY - oldY);
    if (step >= SAMPLE_SPACING * 0.45) {
      state.travelled += step;
      const z = Math.sin(state.travelled * 0.0063 + now * 0.00042)
        + 0.34 * Math.sin(state.travelled * 0.011 + 1.7);
      state.history.push({ x: state.headX, y: state.headY, s: state.travelled, z });
      trimHistory();
    }
  }

  function sampleHistory(distanceBehind) {
    if (state.history.length < 2) return null;
    const targetS = state.travelled - distanceBehind;
    if (targetS < state.history[0].s) return null;

    let low = 0;
    let high = state.history.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >> 1;
      if (state.history[mid].s < targetS) low = mid;
      else high = mid;
    }

    const a = state.history[low];
    const b = state.history[high];
    const span = Math.max(0.001, b.s - a.s);
    const f = Math.max(0, Math.min(1, (targetS - a.s) / span));
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;
    const z = a.z + (b.z - a.z) * f;
    const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    return { x, y, z, angle };
  }

  function updateRibbon(now) {
    if (!state.ready) return;
    advanceHead(now);

    state.nodes.forEach((node, index) => {
      const frame = sampleHistory(state.offsets[index]);
      if (!frame) {
        node.style.opacity = "0";
        return;
      }

      const depth = Math.max(-1, Math.min(1, frame.z));
      const scale = 0.84 + (depth + 1) * 0.105;
      const depthFade = 0.54 + (depth + 1) * 0.23;
      node.style.opacity = String(depthFade);
      node.style.zIndex = String(1000 + Math.round(depth * 420));
      node.style.transform = `translate3d(${frame.x.toFixed(2)}px, ${frame.y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${frame.angle.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    });
  }

  function seedHistory() {
    const w = elements.stage.clientWidth;
    const h = elements.stage.clientHeight;
    state.headX = w * 0.58;
    state.headY = h * 0.55;
    state.velocityX = 0.8;
    state.velocityY = -0.25;
    state.history = [];
    state.travelled = 0;

    const seedLength = state.totalLength + Math.max(w, h) * 1.5;
    for (let s = seedLength; s >= 0; s -= SAMPLE_SPACING) {
      const q = s / Math.max(seedLength, 1);
      const x = w * (0.5 + 0.32 * Math.sin(q * 8.4 + 0.3) + 0.06 * Math.sin(q * 19.1));
      const y = h * (0.54 + 0.27 * Math.sin(q * 6.1 + 1.0) + 0.07 * Math.cos(q * 15.7));
      state.history.push({ x, y, s: state.travelled, z: Math.sin(q * 15.5) });
      state.travelled += SAMPLE_SPACING;
    }
    const tail = state.history[state.history.length - 1];
    state.headX = tail.x;
    state.headY = tail.y;
  }

  function updateMotionButton() {
    elements.motion.setAttribute("aria-pressed", String(state.motion));
    elements.motion.innerHTML = state.motion
      ? '<span aria-hidden="true">Ⅱ</span> Pause'
      : '<span aria-hidden="true">▶</span> Resume';
  }

  function toggleMotion() {
    state.motion = !state.motion;
    state.lastFrame = performance.now();
    updateMotionButton();
  }

  function animate(now) {
    updateRibbon(now);
    window.requestAnimationFrame(animate);
  }

  function bindEvents() {
    elements.motion.addEventListener("click", toggleMotion);
    elements.speed.addEventListener("input", () => {
      state.speed = Number(elements.speed.value) / 100;
    });

    elements.stage.addEventListener("keydown", (event) => {
      if (event.key === " ") {
        event.preventDefault();
        toggleMotion();
      }
    });

    elements.stage.addEventListener("pointermove", (event) => {
      const rect = elements.stage.getBoundingClientRect();
      state.pointerActive = true;
      state.pointerX = event.clientX - rect.left;
      state.pointerY = event.clientY - rect.top;
    });
    elements.stage.addEventListener("pointerleave", () => {
      state.pointerActive = false;
    });

    window.addEventListener("resize", () => {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(() => {
        measureRibbon();
        seedHistory();
      }, 120);
    });
  }

  async function init() {
    try {
      state.catalogue = await loadCatalogue();
      validateSelection();
      const key = `${state.phase}|${state.level}|${state.mask}`;
      const ids = state.catalogue.configurations[key] || [];
      state.terms = ids.map((id) => state.catalogue.terms[id]).filter(Boolean);
      root.classList.toggle("is-colour-mode", state.colour);

      const phaseLabel = state.phase === "unbroken" ? "Symmetric basis" : "Physical basis";
      const level = state.catalogue.levels[state.level];
      elements.level.textContent = `${phaseLabel} · ${level.name}`;
      elements.count.textContent = `${state.terms.length.toLocaleString()} additive term${state.terms.length === 1 ? "" : "s"}`;

      await typesetEquation();
      measureRibbon();
      seedHistory();
      elements.loading.classList.add("is-hidden");
      state.ready = true;
      state.lastFrame = performance.now();
      elements.stage.focus({ preventScroll: true });
    } catch (error) {
      elements.loading.innerHTML = "<b>The floating Lagrangian could not be loaded.</b>";
      console.error("Floating Lagrangian failed:", error);
    }
  }

  bindEvents();
  updateMotionButton();
  window.requestAnimationFrame(animate);
  void init();
})();
