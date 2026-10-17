// Theme toggle (dark by default). Stored locally only. Also drives the mobile menu button.
(function () {
  var btns = document.querySelectorAll('.theme-toggle');
  function current() { return document.documentElement.getAttribute('data-theme'); }
  function label() {
    var dark = current() === 'dark';
    btns.forEach(function (b) {
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
      b.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    });
  }
  label();
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      label();
    });
  });
  var menu = document.getElementById('menu-toggle');
  var side = document.getElementById('sidebar');
  if (menu && side) {
    menu.addEventListener('click', function () {
      var open = side.classList.toggle('open');
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
})();
