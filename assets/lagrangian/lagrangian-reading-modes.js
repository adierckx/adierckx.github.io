(() => {
  "use strict";

  const root = document.getElementById("sm-lagrangian-app");
  if (!root) return;

  const sectorList = root.querySelector("#sm-sector-list");
  const phaseButtons = [...root.querySelectorAll("[data-phase]")];

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
    [...sectorList.querySelectorAll('input[type="checkbox"]')].forEach((input) => {
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

      window.setTimeout(() => {
        const available = availableSectors();
        applySelection(translatedSelection(before, fromPhase, toPhase, available));
      }, 0);
    }, true);
  });
})();
