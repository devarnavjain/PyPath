import store from '../store.js';
import { navigate } from '../router.js';
import { setEditorTheme } from '../components/editor.js';
import { getAvatarHTML } from '../avatars.js';

export function renderTopbar(pageTitle, breadcrumb) {
  const topbar = document.getElementById('js-topbar');
  if (!topbar) return;

  const user = store.currentUser;
  const isDark = store.theme === 'dark';

  let leftContent = '';
  if (breadcrumb && breadcrumb.length > 0) {
    leftContent = breadcrumb
      .map((crumb, i) => {
        const isLast = i === breadcrumb.length - 1;
        const style = isLast
          ? 'color:var(--text-primary);font-weight:600'
          : 'color:var(--text-tertiary)';
        return `<span style="${style};font-size:13px">${crumb}</span>`;
      })
      .join('<span style="color:var(--text-tertiary);margin:0 4px;font-size:12px">›</span>');
  } else {
    leftContent = `<span style="color:var(--text-primary);font-weight:600;font-size:13px">${pageTitle}</span>`;
  }

  topbar.innerHTML = `
    <div style="display:flex;align-items:center;flex:1;min-width:0">
      ${leftContent}
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-left:auto">
      <div class="theme-switch ${isDark ? '' : 'is-light'}" id="js-theme-switch" role="button" aria-label="Toggle theme" tabindex="0">
        <span class="theme-switch-icon theme-switch-icon-sun">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </span>
        <span class="theme-switch-icon theme-switch-icon-moon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </span>
        <div class="theme-switch-thumb"></div>
      </div>
      <div id="js-topbar-avatar" title="${user ? user.name : ''}" style="cursor:pointer;display:inline-flex;line-height:0">
        ${user ? getAvatarHTML(user.avatar_id, 28) : getAvatarHTML(1, 28)}
      </div>
    </div>
  `;

  // Theme toggle
  const themeSwitch = topbar.querySelector('#js-theme-switch');
  if (themeSwitch) {
    themeSwitch.addEventListener('click', () => {
      const newTheme = store.theme === 'dark' ? 'light' : 'dark';
      store.theme = newTheme;
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('pypath-theme', newTheme);
      themeSwitch.classList.toggle('is-light', newTheme === 'light');
      setEditorTheme(newTheme === 'light' ? 'pypath-light' : 'pypath-dark');
    });
  }

  // Avatar click
  const avatarEl = topbar.querySelector('#js-topbar-avatar');
  if (avatarEl) {
    avatarEl.addEventListener('click', () => navigate('#profile'));
  }
}
