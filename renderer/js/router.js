const cleanupFns = [];

export function onRouteCleanup(fn) {
  cleanupFns.push(fn);
}

export function removeRouteCleanup(fn) {
  const idx = cleanupFns.indexOf(fn);
  if (idx !== -1) cleanupFns.splice(idx, 1);
}

const routes = {
  '#dashboard': () => import('./pages/dashboard.js').then(m => m.render()),
  '#learn': () => import('./pages/lesson.js').then(m => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    return m.render(params.get('topic'));
  }),
  '#progress': () => import('./pages/progress.js').then(m => m.render()),
  '#profile': () => import('./pages/profile.js').then(m => m.render()),
  '#quiz': () => import('./pages/quiz.js').then(m => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    return m.render(params.get('topic'));
  }),
  '#challenge': () => import('./pages/challenge.js').then(m => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    return m.render(params.get('topic'));
  }),
};

export function navigate(hash) {
  window.location.hash = hash;
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  cleanupFns.forEach(fn => fn());

  const hash = window.location.hash || '#dashboard';
  const base = hash.split('?')[0];

  const routeFn = routes[base];
  if (routeFn) {
    routeFn().catch(() => renderPlaceholder(hash));
  } else {
    renderPlaceholder(hash);
  }

  updateNavActive(base);
}

function updateNavActive(hash) {
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.route === hash);
  });
}

function renderPlaceholder(hash) {
  const page = document.getElementById('js-page');
  if (page) {
    page.innerHTML = `
      <div style="text-align:center;padding:80px 20px;color:var(--text-secondary)">
        <div style="font-size:48px;margin-bottom:16px">🚧</div>
        <div style="font-family:var(--font-heading);font-size:24px;color:var(--text-primary);margin-bottom:8px">Coming Soon</div>
        <div style="font-size:14px">${hash} will be built in the next phase</div>
      </div>
    `;
  }
}
