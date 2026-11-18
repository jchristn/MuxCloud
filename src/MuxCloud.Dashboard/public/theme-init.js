// Apply the stored theme before first paint to avoid a flash. A separate file (not inline) so a strict
// Content-Security-Policy with script-src 'self' still allows it.
try {
  var stored = localStorage.getItem('muxcloud.theme');
  var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
} catch (e) {
  document.documentElement.dataset.theme = 'light';
}
