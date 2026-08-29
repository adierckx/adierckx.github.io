(() => {
  "use strict";

  const root = document.getElementById("sm-lagrangian-app");
  if (!root) return;

  const sectorList = root.querySelector("#sm-sector-list");
  const phaseButtons = [...root.querySelectorAll("[data-phase]")];
  const savedSelections = new Map();

  function activePhase() {
    return phaseButtons.find((button) => button.getAttribute("aria-pressed") === "true")?.dataset.phase || "unbroken";
  }

  function selectedSectors() {
    return new Set(
      [...sectorList.querySelectorAll('input[type="checkbox"]:checked')]
        .map((input) => input.value),
    );
  }

  function availableSectors() {
    return new Set(
      [...sectorList.querySelectorAll('input[type="checkbox"]')]
        .map((input) => input.value),
    );
  }

  function translatedSelection(selection, fromPhase, toPhase, available) {
    const translated = new Set([...selection].filter((sector) => available.has(sector)));

    if (fromPhase === "unbroken" && toPhase === "broken" && selection.has("electroweak")) {
      if (available.has("qed")) translated.add("qed");
      if (available.has("weak")) translated.add("weak");
    }

    if (fromPhase === "broken" && toPhase === "unbroken"
        && (selection.has("qed") || selection.has("weak"))
        && available.has("electroweak")) {
      translated.add("electroweak");
    }

    return translated;
  }

  function applySelection(selection) {
    const inputs = [...sectorList.querySelectorAll('input[type="checkbox"]')];
    inputs.forEach((input) => {
      const wanted = selection.has(input.value);
      if (input.checked === wanted) return;
      input.checked = wanted;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  phaseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const fromPhase = activePhase();
      const toPhase = button.dataset.phase;
      if (!toPhase || toPhase === fromPhase) return;

      const before = selectedSectors();
      savedSelections.set(fromPhase, new Set(before));

      window.setTimeout(() => {
        const available = availableSectors();
        const remembered = savedSelections.get(toPhase);
        const target = remembered
          ? new Set([...remembered].filter((sector) => available.has(sector)))
          : translatedSelection(before, fromPhase, toPhase, available);

        applySelection(target);
        savedSelections.set(toPhase, new Set(target));
      }, 0);
    }, true);
  });
})();
