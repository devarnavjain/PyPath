import store, { setCurrentUser } from './store.js';
import { renderSplash } from './pages/splash.js';
import { renderSidebar } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';
import { initRouter, navigate } from './router.js';
import { checkAndAwardBadges } from './badgeLogic.js';
import { showBadgeToasts } from './components/toast.js';
import { initZoom } from './zoom.js';

async function updateStreak(user) {
  const today = new Date().toISOString().split('T')[0];
  const lastActive = user.last_active;

  if (lastActive === today) {
    return { streak: user.streak || 0, updated: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = user.streak || 0;
  if (lastActive === yesterdayStr) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }

  try {
    await window.electronAPI.updateUser(user.id, {
      last_active: today,
      streak: newStreak,
    });
    await window.electronAPI.upsertSession(user.id, today, 0, 0).catch(() => {});
  } catch (e) {
    console.error('Streak update failed:', e);
    return { streak: user.streak || 0, updated: false };
  }

  user.last_active = today;
  user.streak = newStreak;
  return { streak: newStreak, updated: true };
}

export async function enterApp(user) {
  setCurrentUser(user);
  localStorage.setItem('pypath-last-user', String(user.id));

  const appEl = document.getElementById('js-app');
  if (!appEl) return;

  appEl.innerHTML = `
    <div class="app-shell" id="js-shell">
      <aside class="sidebar" id="js-sidebar"></aside>
      <div class="main-area">
        <header class="topbar" id="js-topbar"></header>
        <main class="page-content" id="js-page"></main>
      </div>
    </div>
  `;

  await renderSidebar(user);
  renderTopbar('Dashboard');
  initRouter();
  navigate('#dashboard');

  // Streak calculation (once per launch)
  await updateStreak(user);

  // Badge check on boot (catches streak-based badges)
  const newBadges = await checkAndAwardBadges(user.id);
  if (newBadges.length > 0) {
    showBadgeToasts(newBadges);
  }

  await renderSidebar(user);
}

async function bootApp() {
  const appEl = document.getElementById('js-app');
  if (!appEl) return;

  appEl.innerHTML = '';
  renderSplash('full');
}

function playExitAnimation() {
  const overlay = document.getElementById('js-intro-overlay');
  const logoEl = overlay.querySelector('.intro-logo-icon');
  const textEl = overlay.querySelector('.intro-logo-text');
  if (!overlay || !logoEl || !textEl) return;

  // Calculate how far the logo needs to move to reach horizontal center
  const logoRect = logoEl.getBoundingClientRect();
  const logoCenterX = logoRect.left + logoRect.width / 2;
  const screenCenterX = window.innerWidth / 2;
  const shiftX = screenCenterX - logoCenterX;

  // Inject dynamic keyframe for logo animation
  const styleId = 'pypath-exit-keyframe';
  const existing = document.getElementById(styleId);
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes logoCenterZoomOutDynamic {
      0%   { transform: translateX(0) scale(1);               opacity: 1; }
      40%  { transform: translateX(${shiftX}px) scale(1.1);   opacity: 1; }
      100% { transform: translateX(${shiftX}px) scale(3.5);   opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Clear entrance animations first
  logoEl.style.animation = 'none';
  textEl.style.animation = 'none';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {

      // Stage 1: text slides into logo
      textEl.style.animation = 'textIntoLogo 0.4s ease-in forwards';

      // Stage 2: logo moves to exact screen center then zooms out
      setTimeout(() => {
        logoEl.style.animation = 'logoCenterZoomOutDynamic 0.5s ease-out forwards';
      }, 350);

      // Stage 3: fade overlay
      setTimeout(() => {
        overlay.style.transition = 'opacity 0.25s ease';
        overlay.style.opacity = '0';
      }, 750);

      // Stage 4: hide overlay
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
      }, 1050);

    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('PyPath booting...');

  const savedTheme = localStorage.getItem('pypath-theme') || 'dark';
  store.theme = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Init zoom from saved factor BEFORE intro animation
  initZoom();

  // After 2.75s — entrance (1.0s) + hold (1.75s) — trigger text-into-logo exit
  setTimeout(() => {
    playExitAnimation();
  }, 2750);

  // Boot app logic runs in parallel — content renders underneath the overlay
  bootApp();
});
