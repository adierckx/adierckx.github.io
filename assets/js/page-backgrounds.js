(() => {
  const path = window.location.pathname.replace(/\/+$/, '').replace(/\.html$/, '');
  const { dataset } = document.documentElement;

  // The foam demo owns the entire viewport.
  if (path.endsWith('/outreach/foam')) {
    dataset.siteLayout = 'fullscreen';
    return;
  }

  const sections = [
    [/\/research\/papers$/, 'publications'],
    [/\/research\/talks$/, 'talks'],
    [/\/research\/early-research$/, 'early-research'],
    [/\/research\//, 'research'],
    [/\/notes\/(?:bachelor$|ba[123]\/)/, 'bachelor'],
    [/\/notes\/(?:master$|ma[12]\/)/, 'master'],
    [/\/notes\/math(?:\/|$)/, 'math'],
    [/\/outreach\//, 'outreach'],
    [/\/posts\/|\/blog$/, 'blog'],
    [/\/about$/, 'about'],
  ];

  const section = sections.find(([route]) => route.test(path));
  if (section) dataset.pageTheme = section[1];
})();
