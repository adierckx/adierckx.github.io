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
    pointerX: 0,
    pointerY: 0,
    startTime: performance.now(),
    pausedElapsed: 0,
    resizeTimer: 0,
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
    const gap = Math.max(18, Math.min(42, window.innerWidth * 0.022));
    state.nodes.forEach((node) => {
      const width = Math.max(42, node.getBoundingClientRect().width);
      state.offsets.push(cursor + width / 2);
      cursor += width + gap;
    });
    state.totalLength = Math.max(cursor, 1);
  }

  function curvePoint(u, time) {
    const w = elements.stage.clientWidth;
    const h = elements.stage.clientHeight;
    const cx = w * 0.5;
    const cy = h * 0.54;
    const theta = u * Math.PI * 2 - Math.PI * 0.18;
    const breathe = Math.sin(time * 0.00017) * 0.16;
    const sway = Math.sin(time * 0.00011) * 0.24;
    const ax = Math.min(w * 0.42, 720);
    const ay = Math.min(h * 0.34, 360);

    const x = cx
      + ax * Math.sin(theta + sway)
      + ax * 0.12 * Math.sin(3 * theta - time * 0.00013);
    const y = cy
      + ay * Math.sin(2 * theta + breathe)
      + ay * 0.13 * Math.cos(3 * theta + time * 0.00009);
    const z = Math.sin(3 * theta + time * 0.00016) * 0.78
      + Math.cos(theta - time * 0.00008) * 0.22;

    return { x, y, z };
  }

  function curveFrame(u, time) {
    const eps = 0.0015;
    const p = curvePoint(u, time);
    const a = curvePoint(Math.max(0, u - eps), time);
    const b = curvePoint(Math.min(1, u + eps), time);
    const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    return { ...p, angle };
  }

  function updateRibbon(now) {
    if (!state.ready) return;

    const elapsed = state.motion ? Math.max(0, now - state.startTime) : state.pausedElapsed;
    const flow = (elapsed * 0.030 * state.speed) % state.totalLength;
    const visibleLength = Math.max(2600, Math.min(6200, elements.stage.clientWidth * 5.2));
    const parallaxX = state.pointerX * Math.min(46, elements.stage.clientWidth * 0.035);
    const parallaxY = state.pointerY * Math.min(30, elements.stage.clientHeight * 0.04);

    state.nodes.forEach((node, index) => {
      let distance = state.offsets[index] - flow;
      while (distance < 0) distance += state.totalLength;
      const u = distance / visibleLength;

      if (u < 0 || u > 1) {
        node.style.opacity = "0";
        node.style.pointerEvents = "none";
        return;
      }

      const frame = curveFrame(u, now);
      const depth = Math.max(-1, Math.min(1, frame.z));
      const scale = 0.82 + (depth + 1) * 0.12;
      const depthX = parallaxX * (0.55 + 0.45 * depth);
      const depthY = parallaxY * (0.55 + 0.45 * depth);
      const edgeFade = Math.min(1, u / 0.045, (1 - u) / 0.045);
      const depthFade = 0.48 + (depth + 1) * 0.25;

      node.style.opacity = String(Math.max(0, Math.min(1, edgeFade * depthFade)));
      node.style.zIndex = String(1000 + Math.round(depth * 400));
      node.style.pointerEvents = "auto";
      node.style.transform = `translate3d(${(frame.x + depthX).toFixed(2)}px, ${(frame.y + depthY).toFixed(2)}px, 0) translate(-50%, -50%) rotate(${frame.angle.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    });
  }

  function updateMotionButton() {
    elements.motion.setAttribute("aria-pressed", String(state.motion));
    elements.motion.innerHTML = state.motion
      ? '<span aria-hidden="true">Ⅱ</span> Pause'
      : '<span aria-hidden="true">▶</span> Resume';
  }

  function toggleMotion() {
    if (state.motion) {
      state.pausedElapsed = performance.now() - state.startTime;
      state.motion = false;
    } else {
      state.startTime = performance.now() - state.pausedElapsed;
      state.motion = true;
    }
    updateMotionButton();
  }

  function animate(now) {
    updateRibbon(now);
    window.requestAnimationFrame(animate);
  }

  function bindEvents() {
    elements.motion.addEventListener("click", toggleMotion);
    elements.speed.addEventListener("input", () => {
      const elapsed = state.motion ? performance.now() - state.startTime : state.pausedElapsed;
      state.speed = Number(elements.speed.value) / 100;
      if (state.motion) state.startTime = performance.now() - elapsed;
    });

    elements.stage.addEventListener("keydown", (event) => {
      if (event.key === " ") {
        event.preventDefault();
        toggleMotion();
      }
    });

    elements.stage.addEventListener("pointermove", (event) => {
      const rect = elements.stage.getBoundingClientRect();
      state.pointerX = (event.clientX - rect.left) / rect.width - 0.5;
      state.pointerY = (event.clientY - rect.top) / rect.height - 0.5;
    });
    elements.stage.addEventListener("pointerleave", () => {
      state.pointerX = 0;
      state.pointerY = 0;
    });

    window.addEventListener("resize", () => {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(measureRibbon, 120);
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
      elements.loading.classList.add("is-hidden");
      state.ready = true;
      state.startTime = performance.now();
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
