// Home directory: category pills, sidebar category links and search work together.
(function () {
  var wrap = document.getElementById('dir');
  if (!wrap) return;
  var sections = Array.prototype.slice.call(wrap.querySelectorAll('.dir-section'));
  var cards = Array.prototype.slice.call(wrap.querySelectorAll('.dir-card'));
  var count = document.getElementById('dir-count');
  var empty = document.getElementById('dir-empty');
  var group = '', ids = null;
  function apply() {
    var n = 0;
    cards.forEach(function (c) {
      var ok = (!group || c.dataset.group === group) && (ids === null || ids.indexOf(c.dataset.id) !== -1);
      c.hidden = !ok; if (ok) n++;
    });
    sections.forEach(function (s) { s.hidden = !s.querySelector('.dir-card:not([hidden])'); });
    count.textContent = n; empty.hidden = n !== 0;
    document.querySelectorAll('#dir-pills .pill').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.group === group ? 'true' : 'false'); });
    document.querySelectorAll('.dcat-link').forEach(function (a) { if (a.dataset.dcat === group && group) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  document.querySelectorAll('#dir-pills .pill').forEach(function (b) {
    b.addEventListener('click', function () { group = b.dataset.group; apply(); });
  });
  document.querySelectorAll('.dcat-link').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault(); group = a.dataset.dcat; apply();
      var side = document.getElementById('sidebar'), m = document.getElementById('menu-toggle');
      if (side) side.classList.remove('open'); if (m) m.setAttribute('aria-expanded', 'false');
      window.scrollTo(0, 0);
    });
  });
  window.addEventListener('feed-search', function (e) { ids = e.detail.toolIds; apply(); });
  var c = new URLSearchParams(location.search).get('cat');
  if (c) { group = c; apply(); }
  document.addEventListener('keydown', function (e) {
    var t = e.target && e.target.tagName;
    if (e.key === '/' && t !== 'INPUT' && t !== 'TEXTAREA') { var i = document.getElementById('q'); if (i) { e.preventDefault(); i.focus(); } }
  });
})();
