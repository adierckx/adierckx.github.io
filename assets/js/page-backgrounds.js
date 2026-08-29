(() => {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  // Pages with their own bespoke/full-screen backgrounds stay untouched.
  if (
    path === "/" ||
    path.endsWith("/index.html") ||
    path.includes("/outreach/standard-model-lagrangian") ||
    path.includes("/outreach/lagrangian-floating") ||
    path.includes("/outreach/foam")
  ) {
    return;
  }

  let theme = null;

  if (path.includes("/research/papers")) {
    theme = "publications";
  } else if (path.includes("/research/talks")) {
    theme = "talks";
  } else if (path.includes("/research/early-research")) {
    theme = "early-research";
  } else if (path.includes("/research/")) {
    theme = "research";
  } else if (path.includes("/notes/ba1/") || path.includes("/notes/ba2/") || path.includes("/notes/ba3/") || path.includes("/notes/bachelor")) {
    theme = "bachelor";
  } else if (path.includes("/notes/ma1/") || path.includes("/notes/ma2/") || path.includes("/notes/master")) {
    theme = "master";
  } else if (path.includes("/notes/math")) {
    theme = "math";
  } else if (path.includes("/outreach/")) {
    theme = "outreach";
  } else if (path.includes("/posts/") || path.endsWith("/blog") || path.endsWith("/blog.html")) {
    theme = "blog";
  } else if (path.endsWith("/about") || path.endsWith("/about.html")) {
    theme = "about";
  }

  if (theme) {
    document.documentElement.dataset.pageTheme = theme;
  }
})();
