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
    ready: false,
    motion: !prefersReducedMotion,
    speed: 0.8,
    pointerX: 0,
    pointerY: 0,
    startTime: performance.now(),
    pausedElapsed: 0,
  };

  function signedBody(term, index) {
    const body = term.semanticBody || term.body;
    if (index === 0) {
      const sign = term.sign < 0 ? "-" : "";
      return String.raw`\mathcal{L}_{\mathrm{selected}} ={} ${sign}\,${body}`;
    }
    return `${term.sign < 0 ? "-" : "+"}\\;${body}`;
  }

  async function waitForMathJax() {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (window.MathJax?.typesetPromise) return window.MathJax;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    throw new Error("MathJax did not become available.");
  }

  function validateSelection() {
    if (!state.catalogue.phases[state.phase]) state.phase = "unbroken";
    const phase = state.catalogue.phases[state.phase];
    if (!Number.isInteger(state.level) || state.level < 0 || state.level > 4) state.level = 2;
    if (!Number.isInteger(state.mask) || state.mask < 0 || state.mask > phase.allMask) {
      state.mask = phase.allMask;
    }
  }

  function renderRawEquation() {
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
        wrapper.textContent = `\\(${signedBody(term, index)}\\)`;
        fragment.append(wrapper);
      });
    }
    elements.field.append(fragment);
  }

  function updateMotionButton() {
    elements.motion.setAttribute("aria-pressed", String(state.motion));
    elements.motion.innerHTML = state.motion
      ? '<span aria-hidden="true">Ⅱ</span> Pause'
      : '<span aria-hidden="true">▶</span> Resume';
  }

  function toggleMotion() {
    state.motion = !state.motion;
    if (state.motion) {
      state.startTime = performance.now() - state.pausedElapsed;
    } else {
      state.pausedElapsed = performance.now() - state.startTime;
    }
    updateMotionButton();
  }

  function animate(now) {
    if (state.ready && state.motion) {
      const elapsed = Math.max(0, now - state.startTime);
      const duration = 210000 / state.speed;
      const phase = (elapsed % duration) / duration;
      const sweep = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      const travelY = Math.max(
        0,
        elements.field.scrollHeight - elements.stage.clientHeight + 220,
      );
      const y = -travelY * sweep + Math.sin(elapsed * 0.00031) * 18 + state.pointerY * 34;
      const x = Math.sin(elapsed * 0.00017) * 48 + state.pointerX * 58;
      const rotation = Math.sin(elapsed * 0.00011) * 0.34 + state.pointerX * 0.22;
      elements.field.style.transform =
        `translate3d(calc(-50% + ${x.toFixed(2)}px), ${y.toFixed(2)}px, 0) rotate(${rotation.toFixed(3)}deg)`;
    }
    window.requestAnimationFrame(animate);
  }

  function bindEvents() {
    elements.motion.addEventListener("click", toggleMotion);
    elements.speed.addEventListener("input", () => {
      state.speed = Number(elements.speed.value) / 100;
      state.startTime = performance.now();
      state.pausedElapsed = 0;
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
  }

  async function init() {
    try {
      const response = await fetch(root.dataset.catalogue, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
      state.catalogue = await response.json();
      validateSelection();

      const key = `${state.phase}|${state.level}|${state.mask}`;
      const ids = state.catalogue.configurations[key] || [];
      state.terms = ids.map((id) => state.catalogue.terms[id]);
      root.classList.toggle("is-colour-mode", state.colour);

      const phaseLabel = state.phase === "unbroken" ? "Symmetric basis" : "Physical basis";
      const level = state.catalogue.levels[state.level];
      elements.level.textContent = `${phaseLabel} · ${level.name}`;
      elements.count.textContent = `${state.terms.length.toLocaleString()} additive term${state.terms.length === 1 ? "" : "s"}`;

      renderRawEquation();
      const mathJax = await waitForMathJax();
      await mathJax.typesetPromise([elements.field]);
      elements.loading.classList.add("is-hidden");
      state.ready = true;
      state.startTime = performance.now();
      elements.stage.focus({ preventScroll: true });
    } catch (error) {
      elements.loading.innerHTML = "<b>The floating Lagrangian could not be loaded.</b>";
      console.error(error);
    }
  }

  bindEvents();
  updateMotionButton();
  window.requestAnimationFrame(animate);
  void init();
})();
