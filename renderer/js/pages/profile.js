import store from '../store.js';
import { renderTopbar } from '../components/topbar.js';
import { refreshSidebar } from '../components/sidebar.js';
import { renderSplash } from './splash.js';
import { navigate } from '../router.js';
import { BADGE_INFO } from '../badgeLogic.js';
import { getAvatarSVG, getAvatarHTML } from '../avatars.js';

const ALL_BADGES = [
  { id: 'first_lesson', name: 'First Steps', icon: '\uD83D\uDCD6' },
  { id: 'first_run', name: 'Hello World', icon: '\uD83D\uDCBB' },
  { id: 'first_pass', name: 'Sharp Mind', icon: '\uD83E\uDDE0' },
  { id: 'streak_3', name: 'On a Roll', icon: '\uD83D\uDD25' },
  { id: 'streak_7', name: 'Week Warrior', icon: '\u2694\uFE0F' },
  { id: 'streak_30', name: 'Monthly Master', icon: '\uD83D\uDCC5' },
  { id: 'all_beginner', name: 'Solid Foundation', icon: '\uD83C\uDFD7\uFE0F' },
  { id: 'all_intermediate', name: 'Rising Star', icon: '\u2B50' },
  { id: 'all_advanced', name: 'Python Master', icon: '\uD83D\uDC0D' },
  { id: 'speed_run', name: 'Speed Coder', icon: '\u26A1' },
  { id: 'no_hints', name: 'Self-Reliant', icon: '\uD83D\uDCAA' },
  { id: 'first_project', name: 'Builder', icon: '\uD83D\uDD28' },
  { id: 'all_projects', name: 'Architect', icon: '\uD83C\uDFDB\uFE0F' },
];

const XP_LEVELS = [
  { level: 1, xp: 0, title: 'Newbie' },
  { level: 2, xp: 100, title: 'Curious Coder' },
  { level: 3, xp: 250, title: 'Variable Voyager' },
  { level: 4, xp: 500, title: 'Loop Legend' },
  { level: 5, xp: 900, title: 'Function Finder' },
  { level: 6, xp: 1400, title: 'Class Climber' },
  { level: 7, xp: 2000, title: 'Module Master' },
  { level: 8, xp: 2800, title: 'Library Librarian' },
  { level: 9, xp: 3800, title: 'Python Pro' },
  { level: 10, xp: 5000, title: 'Code Sage' },
];

function getXPInfo(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].xp) {
      const current = XP_LEVELS[i];
      const next = XP_LEVELS[i + 1] || XP_LEVELS[i];
      return {
        level: current.level,
        title: current.title,
      };
    }
  }
  return { level: 1, title: 'Newbie' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Earned ${months[d.getMonth()]} ${d.getDate()}`;
}

export async function render() {
  const currentUser = store.currentUser;
  if (!currentUser) {
    navigate('#splash');
    return;
  }

  renderTopbar('Profile');

  const page = document.getElementById('js-page');
  if (!page) return;

  let user = currentUser;
  let progressData = [];
  let badgeData = [];

  try {
    const userRes = await window.electronAPI.getUser(user.id);
    if (userRes.success) user = userRes.data;

    const [progressRes, badgesRes] = await Promise.all([
      window.electronAPI.getProgress(user.id),
      window.electronAPI.getBadges(user.id),
    ]);
    if (progressRes.success) progressData = progressRes.data;
    if (badgesRes.success) badgeData = badgesRes.data;
  } catch (e) {
    console.error('Profile data fetch error:', e);
  }

  const xpInfo = getXPInfo(user.xp || 0);
  const completedTopics = progressData.filter((p) => p.status === 'completed').length;
  const earnedBadgeIds = new Set(badgeData.map((b) => b.badge_id));
  const earnedBadgeDates = {};
  for (const b of badgeData) {
    earnedBadgeDates[b.badge_id] = b.earned_at;
  }



  page.innerHTML = `
    <div class="profile-page">
      <div class="profile-header">
        <div class="profile-avatar-large" id="js-profile-avatar">${getAvatarHTML(user.avatar_id, 80)}</div>
        <div>
          <div class="profile-name-row">
            <span class="profile-name-display" id="js-profile-name-display">${user.name}</span>
            <input class="profile-name-input" id="js-profile-name-input" type="text" value="${user.name}" maxlength="30">
            <button class="profile-edit-icon-btn" id="js-profile-edit-btn" aria-label="Edit name" title="Edit name">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          <div class="profile-level-badge">Lv.${xpInfo.level} · ${xpInfo.title}</div>
          <div class="avatar-picker-row" id="js-avatar-picker"></div>
        </div>
      </div>

      <div class="profile-stats-grid">
        <div class="stat-card">
          <div class="stat-number">${user.xp || 0}</div>
          <div class="stat-label">Total XP</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${completedTopics}</div>
          <div class="stat-label">Topics<br>Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${user.streak || 0}</div>
          <div class="stat-label">Current<br>Streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${badgeData.length} / 13</div>
          <div class="stat-label">Badges<br>Earned</div>
        </div>
      </div>

      <div class="profile-badges-section">
        <div class="section-title">Badges</div>
        <div class="profile-badge-grid">
          ${ALL_BADGES.map((b) => {
            const earned = earnedBadgeIds.has(b.id);
            const desc = BADGE_INFO[b.id] || '';
            const date = earnedBadgeDates[b.id];
            const dateStr = date ? formatDate(date) : '';
            const tooltipText = earned && dateStr ? `${desc}\nEarned ${dateStr}` : desc;
            return `
              <div class="badge-tooltip-wrap">
                <div class="profile-badge-card ${earned ? 'earned' : 'locked'}">
                  <div class="profile-badge-icon">${earned ? b.icon : '\uD83D\uDD12'}</div>
                  <div class="profile-badge-name">${b.name}</div>
                  ${earned && date ? `<div class="profile-badge-date">${formatDate(date)}</div>` : ''}
                </div>
                <span class="badge-tooltip">${tooltipText}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="profile-actions-section" id="js-actions-section">
        <button class="profile-switch-btn" id="js-switch-btn">Switch Profile</button>
        <button class="profile-add-btn" id="js-add-btn">Add New Profile</button>
        <button class="profile-delete-btn" id="js-delete-btn">Delete Profile</button>
      </div>
    </div>
  `;

  setupAvatarPicker(page, user);
  setupNameEditor(page, user);
  setupSwitchButton(page);
  setupAddButton(page);
  setupDeleteButton(page, user);

  setupBadgeTooltips(page);
}

function setupBadgeTooltips(container) {
  container.querySelectorAll('.badge-tooltip-wrap').forEach(wrap => {
    const tooltip = wrap.querySelector('.badge-tooltip');
    if (!tooltip) return;
    wrap.addEventListener('mouseenter', () => {
      const chip = wrap.querySelector('.badge-chip, .profile-badge-card');
      const rect = chip ? chip.getBoundingClientRect() : wrap.getBoundingClientRect();
      tooltip.style.opacity = '1';
      tooltip.style.left = (rect.left + rect.width / 2) + 'px';
      tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
      tooltip.style.transform = 'translateX(-50%)';
    });
    wrap.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });
  });
}

function setupAvatarPicker(page, user) {
  const avatarEl = page.querySelector('#js-profile-avatar');
  const pickerRow = page.querySelector('#js-avatar-picker');

  avatarEl.addEventListener('click', () => {
    const isVisible = pickerRow.style.display !== 'none';
    if (isVisible) {
      pickerRow.style.display = 'none';
      return;
    }

    pickerRow.innerHTML = '';
    pickerRow.style.cssText = `
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      max-width: 280px;
      margin-top: var(--space-3);
    `;

    for (let i = 1; i <= 8; i++) {
      const item = document.createElement('div');
      item.style.cssText = `
        width: 52px;
        height: 52px;
        border-radius: 50%;
        cursor: pointer;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        transition: box-shadow var(--transition-fast);
      `;
      if (i === user.avatar_id) {
        item.style.boxShadow = '0 0 0 3px white, 0 0 0 5px var(--accent-blue)';
      }

      const svgEl = document.createElement('div');
      svgEl.innerHTML = getAvatarSVG(i, 52);
      svgEl.style.cssText = 'display:inline-flex;border-radius:50%;overflow:hidden;width:52px;height:52px;flex-shrink:0';
      item.appendChild(svgEl);

      item.addEventListener('click', async () => {
        if (i === user.avatar_id) return;
        try {
          await window.electronAPI.updateUser(user.id, { avatar_id: i });
          user.avatar_id = i;
          store.currentUser = user;
          pickerRow.style.display = 'none';
          await refreshSidebar();
          renderTopbar('Profile');
          render();
        } catch (e) {
          console.error('Failed to update avatar:', e);
        }
      });
      pickerRow.appendChild(item);
    }
  });
}

function setupNameEditor(page, user) {
  const display = page.querySelector('#js-profile-name-display');
  const input = page.querySelector('#js-profile-name-input');
  const editBtn = page.querySelector('#js-profile-edit-btn');

  let isEditing = false;

  function startEdit() {
    isEditing = true;
    display.style.display = 'none';
    input.style.display = 'block';
    input.focus();
    input.select();
  }

  async function saveName() {
    const newName = input.value.trim();
    if (!newName || newName === user.name) {
      cancelEdit();
      return;
    }
    try {
      await window.electronAPI.updateUser(user.id, { name: newName });
      user.name = newName;
      store.currentUser = user;
      cancelEdit();
      display.textContent = newName;
      await refreshSidebar();
      renderTopbar('Profile');
    } catch (e) {
      console.error('Failed to update name:', e);
      cancelEdit();
    }
  }

  function cancelEdit() {
    isEditing = false;
    input.style.display = 'none';
    display.style.display = 'block';
    input.value = user.name;
  }

  editBtn.addEventListener('click', () => {
    if (isEditing) {
      saveName();
    } else {
      startEdit();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveName();
    }
    if (e.key === 'Escape') {
      cancelEdit();
    }
  });

  input.addEventListener('blur', () => {
    if (isEditing) saveName();
  });
}

function setupSwitchButton(page) {
  const btn = page.querySelector('#js-switch-btn');
  btn.addEventListener('click', () => {
    store.currentUser = null;
    localStorage.removeItem('pypath-last-user');
    renderSplash();
  });
}

function setupAddButton(page) {
  const btn = page.querySelector('#js-add-btn');
  btn.addEventListener('click', () => {
    store.currentUser = null;
    localStorage.removeItem('pypath-last-user');
    renderSplash('create-only');
  });
}

function restoreActionButtons(section) {
  section.innerHTML = `
    <button class="profile-switch-btn" id="js-switch-btn">Switch Profile</button>
    <button class="profile-add-btn" id="js-add-btn">Add New Profile</button>
    <button class="profile-delete-btn" id="js-delete-btn">Delete Profile</button>
  `;
  setupSwitchButton(document.getElementById('js-page'));
  setupAddButton(document.getElementById('js-page'));
  const user = store.currentUser;
  if (user) setupDeleteButton(document.getElementById('js-page'), user);
}

function setupDeleteButton(page, user) {
  const section = page.querySelector('#js-actions-section');
  const deleteBtn = page.querySelector('#js-delete-btn');
  if (!deleteBtn) return;

  deleteBtn.addEventListener('click', () => {
    section.innerHTML = `
      <span style="color:var(--text-secondary);font-size:13px;display:flex;align-items:center">
        Are you sure? This permanently deletes all your progress.
      </span>
      <button class="confirm-delete-btn">Yes, Delete</button>
      <button class="cancel-delete-btn">Cancel</button>
    `;

    const confirmBtn = section.querySelector('.confirm-delete-btn');
    const cancelBtn = section.querySelector('.cancel-delete-btn');

    confirmBtn.addEventListener('click', async () => {
      try {
        await window.electronAPI.deleteUser(user.id);
        localStorage.removeItem('pypath-last-user');
        store.currentUser = null;
        renderSplash('full');
      } catch (e) {
        console.error('Delete failed:', e);
        const errToast = document.createElement('div');
        errToast.className = 'lesson-done-toast';
        errToast.textContent = 'Failed to delete profile. Try again.';
        errToast.style.background = 'var(--error)';
        document.body.appendChild(errToast);
        setTimeout(() => { if (errToast.parentNode) errToast.remove(); }, 2000);
        restoreActionButtons(section);
      }
    });

    cancelBtn.addEventListener('click', () => {
      restoreActionButtons(section);
    });
  });
}
