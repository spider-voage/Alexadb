// SpiderDB — landing page interactions
// Plain JS, no framework.

(function () {
  const root = document.documentElement;
  const nav = document.querySelector('.navbar');
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('.mobile-menu');

  // ---- theme (persisted, defaults to dark) ----
  const savedTheme = localStorage.getItem('spiderdb-theme') || 'dark';
  applyTheme(savedTheme);

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('spiderdb-theme', theme);
    document.querySelectorAll('[data-icon="sun"]').forEach(el => {
      el.style.display = theme === 'dark' ? 'block' : 'none';
    });
    document.querySelectorAll('[data-icon="moon"]').forEach(el => {
      el.style.display = theme === 'dark' ? 'none' : 'block';
    });
  }

  themeToggle?.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  // ---- navbar background on scroll ----
  function handleScroll() {
    if (window.scrollY > 20) nav?.classList.add('scrolled');
    else nav?.classList.remove('scrolled');
  }
  window.addEventListener('scroll', handleScroll);
  handleScroll();

  // ---- mobile menu ----
  menuToggle?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('open');
    document.querySelectorAll('[data-icon="menu"]').forEach(el => el.classList.toggle('hidden'));
    document.querySelectorAll('[data-icon="x"]').forEach(el => el.classList.toggle('hidden'));
  });

  // ---- staggered entrance animation ----
  document.querySelectorAll('[data-animate]').forEach((el, i) => {
    const delay = parseFloat(el.getAttribute('data-delay') || '0') + i * 0;
    setTimeout(() => el.classList.add('in'), 50 + delay * 1000);
  });

  // ---- intersection observer for scroll-triggered animations ----
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
})();
