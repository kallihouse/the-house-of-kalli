(function () {
  const sidebar = document.getElementById('sidebar');
  const toast = document.getElementById('toast');
  let toastTimer;

  document.querySelector('[data-open-menu]').addEventListener('click', function () {
    document.body.classList.add('menu-open');
  });

  document.querySelectorAll('[data-close-menu]').forEach(function (button) {
    button.addEventListener('click', function () {
      document.body.classList.remove('menu-open');
    });
  });

  document.querySelectorAll('[data-action]').forEach(function (button) {
    button.addEventListener('click', function () {
      clearTimeout(toastTimer);
      toast.textContent = button.dataset.action + '.';
      toast.classList.add('show');
      toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2400);
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      document.querySelectorAll('.nav-item').forEach(function (item) { item.classList.remove('active'); });
      link.classList.add('active');
      document.body.classList.remove('menu-open');
      clearTimeout(toastTimer);
      toast.textContent = link.textContent.trim().replace(/[0-9]+$/, '') + ' is ready for the next build.';
      toast.classList.add('show');
      toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2400);
    });
  });

  const now = new Date();
  const hour = now.getHours();
  document.getElementById('greeting').textContent = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('day-name').textContent = new Intl.DateTimeFormat('en-AU', { weekday: 'long' }).format(now);
  document.getElementById('date-name').textContent = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long' }).format(now);
  document.getElementById('year').textContent = now.getFullYear();
})();
