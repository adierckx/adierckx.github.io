(() => {
  "use strict";

  const root = document.getElementById("sm-guide-app");
  if (!root) return;

  const REQUIRED_SCHEMA = 2;
  const FULL_CONFIGURATION = "unbroken|0|31";

  const steps = [
    {
      title: "Symmetry and fields",
      question: "What are we allowed to build the theory from?",
      explanation: "Choose the gauge group and the field multiplets first. The Lagrangian must then be a Lorentz scalar and a singlet under every local gauge transformation. At this stage the equation is deliberately left open: we have ingredients and rules, but no dynamics yet.",
      facts: [
        "The gauge group is SU(3)c × SU(2)L × U(1)Y.",
        "Left- and right-handed fermions occupy different electroweak representations.",
        "With the minimal field content, only the left-handed neutrino appears.",
      ],
      sectors: [],
      added: "Ingredients before dynamics",
    },
    {
      title: "Gauge dynamics",
      question: "How can the force fields propagate while local gauge symmetry remains intact?",
      explanation: "The gauge potentials are not themselves gauge invariant, but their field strengths are. Squaring those curvatures gives the kinetic terms. For the non-Abelian SU(3) and SU(2) factors, the same compact expression also contains gauge-boson self-interactions.",
      facts: [
        "Gμν describes the eight gluon field strengths.",
        "Wμν and Bμν are the electroweak field strengths before symmetry breaking.",
        "Non-Abelian field strengths contain terms quadratic in the gauge potentials.",
      ],
      sectors: ["qcd", "electroweak"],
      newSectors: ["qcd", "electroweak"],
      added: "Gauge-field kinetic terms",
    },
    {
      title: "Matter fields",
      question: "How do quarks and leptons propagate—and feel the gauge fields?",
      explanation: "A free spinor uses the Dirac kinetic term. Replacing the ordinary derivative by the covariant derivative makes that term locally gauge invariant. This single replacement simultaneously provides propagation and the gauge interactions of every fermion multiplet.",
      facts: [
        "The covariant derivative knows the representation and charges of each multiplet.",
        "Expanding Dμ exposes the quark–gluon and electroweak currents.",
        "Three generations repeat the same gauge representations.",
      ],
      sectors: ["qcd", "electroweak", "fermions"],
      newSectors: ["fermions"],
      added: "Fermionic kinetic and gauge terms",
    },
    {
      title: "The Higgs sector",
      question: "How can the electroweak vacuum be non-zero without explicitly breaking gauge invariance?",
      explanation: "Introduce a complex SU(2) doublet H. Its covariant kinetic term couples it to the electroweak fields, while the gauge-invariant potential V(H) can favour a non-zero vacuum magnitude. The Lagrangian remains symmetric even though the chosen vacuum is not.",
      facts: [
        "The Higgs kinetic term later produces the W and Z masses.",
        "The potential depends only on the gauge-invariant combination H†H.",
        "The photon remains massless because an unbroken U(1)em survives.",
      ],
      sectors: ["qcd", "electroweak", "fermions", "higgs"],
      newSectors: ["higgs"],
      added: "Higgs dynamics and potential",
    },
    {
      title: "Yukawa couplings",
      question: "How can left- and right-handed fermions be connected without inserting forbidden mass terms?",
      explanation: "The Higgs doublet supplies the electroweak quantum numbers needed to join left- and right-handed fermions in gauge-invariant operators. The Yukawa matrices live in generation space. After the Higgs acquires its vacuum value, these interactions become fermion masses and Higgs–fermion couplings.",
      facts: [
        "Yu, Yd, and Ye are independent complex matrices.",
        "Their singular values determine the charged-fermion masses.",
        "Their relative diagonalisation produces flavour mixing in the quark sector.",
      ],
      sectors: ["qcd", "electroweak", "fermions", "higgs", "yukawa"],
      newSectors: ["yukawa"],
      added: "Yukawa interactions",
    },
    {
      title: "The complete structure",
      question: "What has symmetry fixed, and what still has to be measured?",
      explanation: "We now have the displayed classical, gauge-invariant, renormalisable core of the minimal Standard Model in the symmetric basis. Within the stated scope its operator structure is highly constrained, but the coupling constants, Higgs-potential parameters, and Yukawa matrices are not predicted by the model.",
      facts: [
        "Expanding the same seven compact terms produces hundreds of explicit monomials.",
        "Changing to the physical basis reorganises fields; it does not add new physics by hand.",
        "Neutrino masses, gauge fixing, ghosts, the QCD θ-term, and higher-dimensional operators lie outside this displayed scope.",
      ],
      sectors: ["qcd", "electroweak", "fermions", "higgs", "yukawa"],
      newSectors: [],
      added: "Minimal Standard Model complete",
    },
  ];

  const elements = {
    stepList: root.querySelector("#sm-guide-step-list"),
    progress: root.querySelector("#sm-guide-progress"),
    formula: root.querySelector("#sm-guide-formula"),
    termCount: root.querySelector("#sm-guide-term-count"),
    added: root.querySelector("#sm-guide-added"),
    kicker: root.querySelector("#sm-guide-kicker"),
    title: root.querySelector("#sm-guide-title"),
    question: root.querySelector("#sm-guide-question"),
    explanation: root.querySelector("#sm-guide-explanation"),
    facts: root.querySelector("#sm-guide-facts"),
    previous: root.querySelector("#sm-guide-previous"),
    next: root.querySelector("#sm-guide-next"),
    atlas: root.querySelector("#sm-guide-atlas-link"),
  };

  const state = {
    catalogue: null,
    baseTerms: [],
    step: 0,
    renderToken: 0,
  };

  async function waitForMathJax() {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      if (window.MathJax?.typesetPromise) return window.MathJax;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    throw new Error("MathJax did not become available.");
  }

  async function loadCatalogue() {
    const response = await fetch(`${root.dataset.catalogue}?schema=${REQUIRED_SCHEMA}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
    const catalogue = await response.json();
    if (catalogue.schemaVersion !== REQUIRED_SCHEMA || !catalogue.configurations?.[FULL_CONFIGURATION]) {
      throw new Error("The catalogue is incompatible with this guide.");
    }
    return catalogue;
  }

  function selectedTerms(step) {
    const sectors = new Set(step.sectors);
    return state.baseTerms.filter((term) => sectors.has(term.sector));
  }

  function selectedMask(step) {
    const sectors = state.catalogue.phases.unbroken.sectors;
    return sectors.reduce((mask, sector, index) => mask | (step.sectors.includes(sector) ? 1 << index : 0), 0);
  }

  function signedBody(term, index) {
    const body = term.semanticBody || term.body;
    if (index === 0) {
      const sign = term.sign < 0 ? "-" : "";
      return String.raw`\mathcal{L}_{\mathrm{SM}} ={} ${sign}\,${body}`;
    }
    return `${term.sign < 0 ? "-" : "+"}\\;${body}`;
  }

  async function renderFormula(step, token) {
    const terms = selectedTerms(step);
    elements.formula.classList.add("is-changing");
    elements.formula.setAttribute("aria-busy", "true");
    const mathJax = await waitForMathJax();
    if (token !== state.renderToken) return;
    if (mathJax.typesetClear) mathJax.typesetClear([elements.formula]);
    elements.formula.replaceChildren();

    if (!terms.length) {
      const placeholder = document.createElement("div");
      placeholder.className = "sm-guide-placeholder";
      placeholder.textContent = String.raw`\(\mathcal L_{\mathrm{SM}} =\; ?\)`;
      elements.formula.append(placeholder);
    } else {
      const newSectors = new Set(step.newSectors || []);
      const fragment = document.createDocumentFragment();
      terms.forEach((term, index) => {
        const wrapper = document.createElement("span");
        wrapper.className = `sm-guide-term sm-sector--${term.sector}`;
        wrapper.classList.toggle("is-new", newSectors.has(term.sector));
        wrapper.textContent = `\\(${signedBody(term, index)}\\)`;
        fragment.append(wrapper);
      });
      elements.formula.append(fragment);
    }

    await mathJax.typesetPromise([elements.formula]);
    if (token !== state.renderToken) return;
    elements.formula.classList.remove("is-changing");
    elements.formula.setAttribute("aria-busy", "false");
    elements.termCount.textContent = terms.length
      ? `${terms.length} compact term${terms.length === 1 ? "" : "s"}`
      : "No dynamics yet";
  }

  function renderCopy(step) {
    elements.kicker.textContent = `Step ${state.step + 1} of ${steps.length}`;
    elements.title.textContent = step.title;
    elements.question.textContent = step.question;
    elements.explanation.textContent = step.explanation;
    elements.added.textContent = step.added;
    elements.facts.replaceChildren();
    step.facts.forEach((fact) => {
      const item = document.createElement("li");
      item.textContent = fact;
      elements.facts.append(item);
    });
  }

  function updateNavigation(step) {
    elements.stepList.querySelectorAll("[data-step]").forEach((button) => {
      const active = Number(button.dataset.step) === state.step;
      button.setAttribute("aria-current", active ? "step" : "false");
    });
    elements.progress.style.width = `${((state.step + 1) / steps.length) * 100}%`;
    elements.previous.disabled = state.step === 0;
    elements.next.disabled = state.step === steps.length - 1;
    elements.atlas.href = `standard-model-lagrangian.html?phase=unbroken&level=0&mask=${selectedMask(step)}&colour=1&explain=0`;
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(state.step + 1));
    window.history.replaceState(null, "", url);
  }

  function showStep(index) {
    const nextIndex = Math.max(0, Math.min(steps.length - 1, index));
    state.step = nextIndex;
    const step = steps[state.step];
    const token = ++state.renderToken;
    renderCopy(step);
    updateNavigation(step);
    void renderFormula(step, token).catch((error) => {
      console.error("Guided equation rendering failed:", error);
      if (token !== state.renderToken) return;
      elements.formula.classList.remove("is-changing");
      elements.formula.setAttribute("aria-busy", "false");
      elements.formula.textContent = "The equation could not be typeset.";
    });
  }

  function bindEvents() {
    elements.stepList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-step]");
      if (button) showStep(Number(button.dataset.step));
    });
    elements.previous.addEventListener("click", () => showStep(state.step - 1));
    elements.next.addEventListener("click", () => showStep(state.step + 1));
    root.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") showStep(state.step - 1);
      if (event.key === "ArrowRight") showStep(state.step + 1);
    });
  }

  async function init() {
    try {
      state.catalogue = await loadCatalogue();
      state.baseTerms = state.catalogue.configurations[FULL_CONFIGURATION]
        .map((id) => state.catalogue.terms[id])
        .filter(Boolean);
      const requested = Number(new URLSearchParams(window.location.search).get("step"));
      state.step = Number.isInteger(requested) ? Math.max(0, Math.min(steps.length - 1, requested - 1)) : 0;
      bindEvents();
      showStep(state.step);
    } catch (error) {
      console.error("Guided chapter setup failed:", error);
      elements.termCount.textContent = "Catalogue unavailable";
      elements.formula.setAttribute("aria-busy", "false");
      elements.formula.textContent = "The Standard Model catalogue could not be loaded.";
    }
  }

  void init();
})();
