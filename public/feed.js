// Home page filters: category, tool, "New this week" pill, search and sort work together.
// Without JS the category links go to category pages and the tool links go to the home page.
(function () {
  var feed = document.getElementById('feed');
  if (!feed) return;
  var cards = Array.prototype.slice.call(feed.children);
  var count = document.getElementById('feed-count');
  var empty = document.getElementById('feed-empty');
  var cat = '', tool = '', ids = null, onlyNew = false;
  function apply() {
    var n = 0;
    cards.forEach(function (c) {
      var ok = (!cat || c.dataset.cat === cat) &&
        (!tool || (c.dataset.tools || '').split('|').indexOf(tool) !== -1) &&
        (!onlyNew || c.dataset.new === '1') &&
        (ids === null ? true : ids.indexOf(c.dataset.id) !== -1);
      c.hidden = !ok; if (ok) n++;
    });
    count.textContent = n; empty.hidden = n !== 0;
  }
  function mark(sel, attr, val) {
    document.querySelectorAll(sel).forEach(function (x) {
      if (attr === 'aria-current') { if (x === val) x.setAttribute(attr, 'true'); else x.removeAttribute(attr); }
    });
  }
  function closeMenu() {
    var side = document.getElementById('sidebar'), m = document.getElementById('menu-toggle');
    if (side) side.classList.remove('open'); if (m) m.setAttribute('aria-expanded', 'false');
  }
  document.querySelectorAll('.cat-link').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault(); cat = a.dataset.cat; tool = '';
      mark('.cat-link', 'aria-current', a); mark('.tool-link', 'aria-current', null);
      apply(); closeMenu(); window.scrollTo(0, 0);
    });
  });
  function setTool(name) {
    tool = name; cat = '';
    document.querySelectorAll('.tool-link').forEach(function (x) {
      if (x.dataset.tool === name && name) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current');
    });
    mark('.cat-link', 'aria-current', name ? null : document.querySelector('.cat-link[data-cat=""]'));
    apply();
  }
  document.querySelectorAll('.tool-link').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault(); setTool(tool === a.dataset.tool ? '' : a.dataset.tool); closeMenu(); window.scrollTo(0, 0);
    });
  });
  document.querySelectorAll('#pills .pill').forEach(function (b) {
    b.addEventListener('click', function () {
      onlyNew = b.dataset.pill === 'new';
      document.querySelectorAll('#pills .pill').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      apply();
    });
  });
  document.querySelectorAll('.seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var sorted = cards.slice().sort(b.dataset.sort === 'az'
        ? function (x, y) { return x.dataset.title.localeCompare(y.dataset.title); }
        : function (x, y) { return x.dataset.i - y.dataset.i; });
      sorted.forEach(function (c) { feed.appendChild(c); });
    });
  });
  window.addEventListener('feed-search', function (e) { ids = e.detail.ids; apply(); });
  var q = new URLSearchParams(location.search).get('tool');
  if (q) setTool(q.toLowerCase());
  document.addEventListener('keydown', function (e) {
    var t = e.target && e.target.tagName;
    if (e.key === '/' && t !== 'INPUT' && t !== 'TEXTAREA') { var i = document.getElementById('q'); if (i) { e.preventDefault(); i.focus(); } }
  });
})();
