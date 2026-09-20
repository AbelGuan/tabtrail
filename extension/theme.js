// Apply before the stylesheet loads so a saved theme does not flash on reload.
(() => {
  let theme = 'rounded';
  try {
    if (localStorage.getItem('atlas-theme-v1') === 'classic') theme = 'classic';
  } catch {}
  document.documentElement.dataset.theme = theme;
})();

// Color preference is independent of the rounded/classic layout.
(() => {
  const key = 'atlas-color-mode-v1';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const normalize = value => ['light', 'dark', 'system'].includes(value) ? value : 'system';
  let mode = 'system';
  try { mode = normalize(localStorage.getItem(key)); } catch {}
  function apply() {
    document.documentElement.dataset.colorMode = mode;
    document.documentElement.dataset.colorScheme = mode === 'system' ? (system.matches ? 'dark' : 'light') : mode;
    window.dispatchEvent(new Event('atlas-color-mode-change'));
  }
  window.atlasColorMode = {
    get value() { return mode; },
    set(value) {
      mode = normalize(value);
      apply();
      try { localStorage.setItem(key, mode); return true; } catch { return false; }
    }
  };
  system.addEventListener('change', () => { if (mode === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.storageArea !== localStorage || (event.key !== key && event.key !== null)) return;
    mode = normalize(event.newValue);
    apply();
  });
  apply();
})();
