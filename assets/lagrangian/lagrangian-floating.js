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
  const MAX_POOL_SIZE = 24;
  const MAX_RENDER_CACHE = 1800;
  const PATH_SAMPLES = 128;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(window.location.search);
  const levelParam = params.get("level");
  const maskParam = params.get("mask");
  const FLAVOUR_SELECTOR = [
    ".sm-symbol--up-quark",
    ".sm-symbol--charm-quark",
    ".sm-symbol--top-quark",
    ".sm-symbol--down-quark",
    ".sm-symbol--strange-quark",
    ".sm-symbol--bottom-quark",
    ".sm-symbol--electron",
    ".sm-symbol--muon",
    ".sm-symbol--tau-lepton",
    ".sm-symbol--electron-neutrino",
    ".sm-symbol--muon-neutrino",
    ".sm-symbol--tau-neutrino",
    ".sm-symbol--up-type",
    ".sm-symbol--down-type",
    ".sm-symbol--charged-lepton",
    ".sm-symbol--neutrino",
    ".sm-symbol--generic-fermion",
  ].join(",");

  const state = {
    catalogue: null,
    mathJax: null,
    phase: params.get("phase") || "unbroken",
    level: levelParam === null ? 2 : Number(levelParam),
    mask: maskParam === null ? Number.NaN : Number(maskParam),
    colour: params.get("colour") === "1",
    terms: [],
    nodes: [],
    path: [],
    pathLength: 1,
    progress: 0,
    lastTail: 0,
    nextTermIndex: 0,
    renderQueue: Promise.resolve(),
    renderCache: new Map(),
    ready: false,
    motion: !prefersReducedMotion,
    speed: 0.8,
    pointerActive: false,
    pointerBlend: 0,
    pointerX: 0,
    pointerY: 0,
    waveTime: 0,
    lastFrame: performance.now(),
  };

  function sequenceLength() {
    return Math.max(1, state.terms.length);
  }

  function termAt(index) {
    return state.terms.length ? state.terms[index] : null;
  }

  function signedBody(term, index, semantic = false) {
    if (!term) return String.raw`\mathcal{L}_{\mathrm{selected}}=0`;
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

  function cacheKey(termIndex) {
    if (!state.terms.length) return "empty";
    return `${termIndex}|${state.colour ? "semantic" : "plain"}`;
  }

  function estimateWidth(termIndex) {
    const term = termAt(termIndex);
    if (!term) return 240;
    const body = term.body;
    // TeX commands collapse substantially when typeset.  This conservative
    // estimate is used while an off-screen recycled node is being prepared.
    return Math.max(110, Math.min(760, 55 + body.length * 1.9));
  }

  function applyColourVariation(record) {
    if (!state.colour) return;
    record.element.querySelectorAll(FLAVOUR_SELECTOR).forEach((symbol, index) => {
      symbol.dataset.smTone = String((record.termIndex + index) % 5);
    });
  }

  function rememberRecord(record) {
    applyColourVariation(record);
    const key = cacheKey(record.termIndex);
    state.renderCache.set(key, record.element.innerHTML);
    while (state.renderCache.size > MAX_RENDER_CACHE) {
      state.renderCache.delete(state.renderCache.keys().next().value);
    }
  }

  function prepareRecordMarkup(record, termIndex) {
    const term = termAt(termIndex);
    record.termIndex = termIndex;
    record.ready = false;
    record.element.className = term
      ? `sm-floating-term sm-sector--${term.sector}`
      : "sm-floating-term";
    record.element.dataset.termIndex = String(termIndex);
    record.element.style.opacity = "0";
    record.element.style.transform = "";
    const key = cacheKey(termIndex);
    const cached = state.renderCache.get(key);
    if (cached) {
      record.element.innerHTML = cached;
      state.renderCache.delete(key);
      state.renderCache.set(key, cached);
      record.ready = true;
      return false;
    }
    record.element.textContent = `\\(${signedBody(term, termIndex, state.colour)}\\)`;
    return true;
  }

  function measuredWidth(record) {
    return Math.max(90, Math.min(1600, record.element.getBoundingClientRect().width || record.spacingWidth));
  }

  async function typesetRecords(records) {
    const pending = records.filter((record) => !record.ready);
    for (let start = 0; start < pending.length; start += 8) {
      const batch = pending.slice(start, start + 8);
      await state.mathJax.typesetPromise(batch.map((record) => record.element));
      batch.forEach((record) => {
        record.ready = true;
        rememberRecord(record);
      });
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  async function buildInitialPool() {
    elements.field.replaceChildren();
    const poolSize = Math.min(
      sequenceLength(),
      MAX_POOL_SIZE,
      Math.max(10, Math.ceil(elements.stage.clientWidth / 240) + 6),
    );
    const fragment = document.createDocumentFragment();
    state.nodes = [];
    for (let index = 0; index < poolSize; index += 1) {
      const element = document.createElement("span");
      const record = {
        element,
        termIndex: index,
        center: 0,
        spacingWidth: estimateWidth(index),
        ready: false,
        renderVersion: 0,
      };
      prepareRecordMarkup(record, index);
      state.nodes.push(record);
      fragment.append(element);
    }
    elements.field.append(fragment);
    await typesetRecords(state.nodes);

    const gap = Math.max(42, Math.min(86, elements.stage.clientWidth * 0.05));
    let cursor = 0;
    state.nodes.forEach((record) => {
      record.spacingWidth = measuredWidth(record);
      record.center = cursor + record.spacingWidth / 2;
      cursor += record.spacingWidth + gap;
    });
    state.lastTail = Math.max(0, cursor - gap);
    state.nextTermIndex = poolSize % sequenceLength();
    state.progress = 0;
  }

  async function renderRecycledRecord(record, version) {
    if (record.ready || version !== record.renderVersion) return;
    try {
      await state.mathJax.typesetPromise([record.element]);
      if (version !== record.renderVersion) return;
      record.ready = true;
      rememberRecord(record);
    } catch (error) {
      console.error("Floating term rendering failed:", error);
      if (version !== record.renderVersion) return;
      record.element.textContent = `\\(${signedBody(termAt(record.termIndex), record.termIndex, false)}\\)`;
      await state.mathJax.typesetPromise([record.element]);
      if (version !== record.renderVersion) return;
      record.ready = true;
    }
  }

  function queueRecordRender(record) {
    const version = ++record.renderVersion;
    state.renderQueue = state.renderQueue
      .catch(() => {})
      .then(() => renderRecycledRecord(record, version));
  }

  function recycleExitedNodes() {
    const gap = Math.max(42, Math.min(86, elements.stage.clientWidth * 0.05));
    state.nodes.forEach((record) => {
      if (record.center + record.spacingWidth / 2 >= state.progress - gap) return;
      const termIndex = state.nextTermIndex;
      state.nextTermIndex = (state.nextTermIndex + 1) % sequenceLength();
      if (state.mathJax.typesetClear) state.mathJax.typesetClear([record.element]);
      const needsTypeset = prepareRecordMarkup(record, termIndex);
      const spacingWidth = record.ready ? measuredWidth(record) : estimateWidth(termIndex);
      record.spacingWidth = spacingWidth;
      record.center = state.lastTail + gap + spacingWidth / 2;
      state.lastTail = record.center + spacingWidth / 2;
      if (needsTypeset) queueRecordRender(record);
    });
  }

  function buildPath() {
    const width = elements.stage.clientWidth;
    const height = elements.stage.clientHeight;
    const top = Math.max(118, height * 0.14);
    const bottom = Math.max(top + 120, height - Math.max(70, height * 0.08));
    const usable = Math.max(160, bottom - top);
    const margin = Math.min(320, Math.max(150, width * 0.18));
    const phase = state.waveTime * 0.00012;
    const points = [];
    let length = 0;

    for (let index = 0; index <= PATH_SAMPLES; index += 1) {
      const u = index / PATH_SAMPLES;
      const x = -margin + (width + margin * 2) * u;
      const slowDrift = Math.sin(phase * 0.63) * usable * 0.055;
      let y = top + usable * (
        0.51
        + 0.24 * Math.sin(Math.PI * 2 * u + phase)
        + 0.065 * Math.sin(Math.PI * 4 * u - phase * 0.72 + 0.8)
      ) + slowDrift;

      if (state.pointerBlend > 0.001) {
        const radius = Math.max(170, width * 0.24);
        const local = Math.exp(-((x - state.pointerX) ** 2) / (2 * radius ** 2));
        y += (state.pointerY - y) * local * state.pointerBlend * 0.68;
      }

      y = Math.max(top, Math.min(bottom, y));
      if (points.length) length += Math.hypot(x - points.at(-1).x, y - points.at(-1).y);
      points.push({ x, y, s: length });
    }
    state.path = points;
    state.pathLength = Math.max(1, length);
  }

  function samplePath(distance) {
    if (distance < 0 || distance > state.pathLength || state.path.length < 2) return null;
    let low = 0;
    let high = state.path.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >> 1;
      if (state.path[mid].s < distance) low = mid;
      else high = mid;
    }
    const a = state.path[low];
    const b = state.path[high];
    const span = Math.max(0.001, b.s - a.s);
    const fraction = Math.max(0, Math.min(1, (distance - a.s) / span));
    const x = a.x + (b.x - a.x) * fraction;
    const y = a.y + (b.y - a.y) * fraction;
    const tangent = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    return { x, y, tangent, u: distance / state.pathLength };
  }

  function updateRibbon() {
    buildPath();
    recycleExitedNodes();
    state.nodes.forEach((record) => {
      if (!record.ready) {
        record.element.style.opacity = "0";
        return;
      }
      const distance = record.center - state.progress;
      const frame = samplePath(distance);
      if (!frame) {
        record.element.style.opacity = "0";
        return;
      }
      const edge = Math.max(0, Math.min(1, distance / 150, (state.pathLength - distance) / 150));
      const depth = Math.sin(frame.u * Math.PI * 2 + state.waveTime * 0.00022 + record.termIndex * 0.17);
      const scale = 0.9 + (depth + 1) * 0.06;
      const angle = Math.max(-52, Math.min(52, frame.tangent));
      record.element.style.opacity = String(edge * (0.68 + (depth + 1) * 0.16));
      record.element.style.zIndex = String(1000 + Math.round(depth * 250));
      record.element.style.transform = `translate3d(${frame.x.toFixed(2)}px, ${frame.y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${angle.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    });
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
    const elapsed = Math.min(40, Math.max(0, now - state.lastFrame));
    state.lastFrame = now;
    const targetBlend = state.pointerActive ? 1 : 0;
    state.pointerBlend += (targetBlend - state.pointerBlend) * Math.min(1, elapsed * 0.006);
    if (state.ready && state.motion) {
      state.waveTime += elapsed;
      state.progress += elapsed * (0.026 + state.speed * 0.064);
    }
    if (state.ready) updateRibbon();
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
      elements.count.textContent = `${state.terms.length.toLocaleString()} additive term${state.terms.length === 1 ? "" : "s"} · continuous ribbon`;

      state.mathJax = await waitForMathJax();
      try {
        await buildInitialPool();
      } catch (semanticError) {
        if (!state.colour) throw semanticError;
        console.warn("Semantic floating rendering failed; using plain TeX.", semanticError);
        state.colour = false;
        root.classList.remove("is-colour-mode");
        if (state.mathJax.typesetClear) state.mathJax.typesetClear([elements.field]);
        await buildInitialPool();
      }
      buildPath();
      elements.loading.classList.add("is-hidden");
      state.ready = true;
      state.lastFrame = performance.now();
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
