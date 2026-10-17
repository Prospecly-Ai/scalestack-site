// Theme toggle: respects prefers-color-scheme until the visitor chooses. Stored locally only.
(function () {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  function current() { return document.documentElement.getAttribute('data-theme'); }
  function label() { btn.textContent = current() === 'dark' ? 'Light mode' : 'Dark mode'; btn.setAttribute('aria-pressed', current() === 'dark' ? 'true' : 'false'); }
  label();
  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    label();
  });
})();
