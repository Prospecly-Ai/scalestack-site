// Client-side search over /search.json. No third-party scripts, no external requests.
// On the home page (#feed exists) it filters the use case cards in place (see feed.js) and lists matching tool pages.
// Elsewhere it lists matching tools and use cases.
(function () {
  var input = document.getElementById('q');
  if (!input) return;
  var out = document.getElementById('search-results');
  var status = document.getElementById('search-status');
  var feedMode = !!document.getElementById('feed');
  var index = null;
  function hay(t) { return (t.name + ' ' + t.summary + ' ' + t.job).toLowerCase(); }
  function card(t) {
    var li = document.createElement('li'); li.className = 'card';
    var h = document.createElement('h3'); var a = document.createElement('a'); a.href = t.url; a.textContent = t.name; h.appendChild(a);
    var p = document.createElement('p'); p.className = 'sum'; p.textContent = t.summary;
    li.appendChild(h); li.appendChild(p); return li;
  }
  function render(q) {
    out.textContent = '';
    q = q.trim().toLowerCase();
    var cases = [], tools = [];
    if (q) { index.forEach(function (t) { if (hay(t).indexOf(q) !== -1) (t.type === 'tool' ? tools : cases).push(t); }); }
    if (feedMode) {
      window.dispatchEvent(new CustomEvent('feed-search', { detail: { q: q, ids: q ? cases.map(function (t) { return t.id; }) : null } }));
      tools.forEach(function (t) { out.appendChild(card(t)); });
      status.textContent = q ? (cases.length + ' use cases and ' + tools.length + ' tool pages match "' + input.value.trim() + '"') : '';
      return;
    }
    if (!q) { status.textContent = ''; return; }
    var hits = tools.concat(cases);
    status.textContent = hits.length + (hits.length === 1 ? ' result matches' : ' results match') + ' "' + input.value.trim() + '"';
    hits.forEach(function (t) { out.appendChild(card(t)); });
  }
  input.addEventListener('input', function () {
    if (index) return render(input.value);
    fetch('/search.json').then(function (r) { return r.json(); }).then(function (j) { index = j; render(input.value); });
  });
})();
