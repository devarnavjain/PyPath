const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;
const ZOOM_SCROLL_STEP = 0.05;
const ZOOM_DEFAULT = 1.0;
const ZOOM_STORAGE_KEY = 'pypath-zoom';

function showZoomToast(factor) {
  const pct = Math.round(factor * 100);
  const existing = document.querySelector('.zoom-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'zoom-toast';
  toast.textContent = `\uD83D\uDD0D Zoom: ${pct}%`;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: 'var(--bg-tertiary, #21262D)',
    color: 'var(--text-primary, #F0F6FC)',
    padding: '8px 16px',
    borderRadius: '8px',
    fontFamily: 'var(--font-body, DM Sans, sans-serif)',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid var(--border-default, #30363D)',
    zIndex: '10000',
    opacity: '1',
    transition: 'opacity 0.3s ease-out',
    pointerEvents: 'none',
  });
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
  }, 1500);
}

function setZoom(factor, showToast = true) {
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN,
    Math.round(factor * 100) / 100));
  window.electronAPI.setZoomFactor(clamped);
  localStorage.setItem(ZOOM_STORAGE_KEY, clamped.toString());
  if (showToast) showZoomToast(clamped);
}

export function initZoom() {
  const saved = parseFloat(localStorage.getItem(ZOOM_STORAGE_KEY));
  const initial = isNaN(saved) ? ZOOM_DEFAULT
    : Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, saved));
  window.electronAPI.setZoomFactor(initial);

  window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey) return;
    if (e.key === '+' || e.key === '=' || e.code === 'Equal') {
      e.preventDefault();
      const current = window.electronAPI.getZoomFactor();
      setZoom(current + ZOOM_STEP);
    } else if (e.key === '-' || e.code === 'Minus') {
      e.preventDefault();
      const current = window.electronAPI.getZoomFactor();
      setZoom(current - ZOOM_STEP);
    } else if (e.key === '0' || e.code === 'Digit0') {
      e.preventDefault();
      setZoom(ZOOM_DEFAULT);
    }
  });

  window.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    const current = window.electronAPI.getZoomFactor();
    setZoom(current + direction * ZOOM_SCROLL_STEP);
  }, { passive: false });
}
