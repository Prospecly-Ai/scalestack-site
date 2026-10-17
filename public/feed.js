// Home page filters: category chips, tool chips and search work together. Without JS the chips are plain links to category pages.
(function () {
  var feed = document.getElementById('feed');
  if (!feed) return;
  var cards = Array.prototype.slice.call(feed.children);
  var count = document.getElementById('feed-count');
  var empty = document.getElementById('feed-empty');
  var cat = '', tool = '', ids = null, q = '';
  function apply() {
    var n = 0;
    cards.forEach(function (c) {
      var ok = (!cat || c.dataset.cat === cat) &&
        (!tool || (c.dataset.tools || '').split('|').indexOf(tool) !== -1) &&
        (ids === null ? true : ids.indexOf(c.dataset.id) !== -1);
      c.hidden = !ok; if (ok) n++;
    });
    count.textContent = n; empty.hidden = n !== 0;
  }
  document.querySelectorAll('#cat-chips .chip').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault(); cat = a.dataset.cat;
      document.querySelectorAll('#cat-chips .chip').forEach(function (x) { x.removeAttribute('aria-current'); });
      a.setAttribute('aria-current', 'true'); apply();
    });
  });
  document.querySelectorAll('#tool-chips .chip').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') === 'true';
      document.querySelectorAll('#tool-chips .chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      tool = on ? '' : b.dataset.tool; b.setAttribute('aria-pressed', on ? 'false' : 'true'); apply();
    });
  });
  window.addEventListener('feed-search', function (e) { q = e.detail.q; ids = e.detail.ids; apply(); });
})();
