import store from '../store.js';
import { navigate } from '../router.js';
import { isTopicUnlocked } from '../adaptiveLogic.js';
import { getAvatarHTML } from '../avatars.js';

const XP_LEVELS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 500 },
  { level: 5, xp: 900 },
  { level: 6, xp: 1400 },
  { level: 7, xp: 2000 },
  { level: 8, xp: 2800 },
  { level: 9, xp: 3800 },
  { level: 10, xp: 5000 },
];

function getXPProgress(xp) {
  let currentLevel = 1;
  let currentXp = 0;
  let nextXp = 100;

  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].xp) {
      currentLevel = XP_LEVELS[i].level;
      currentXp = XP_LEVELS[i].xp;
      nextXp = i < XP_LEVELS.length - 1 ? XP_LEVELS[i + 1].xp : XP_LEVELS[i].xp;
      break;
    }
  }

  const range = nextXp - currentXp;
  const progress = range > 0 ? ((xp - currentXp) / range) * 100 : 100;

  return { level: currentLevel, current: currentXp, next: nextXp, progress: Math.min(progress, 100) };
}

function iconGrid() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" fill="#0D1117"/><rect x="9" y="1" width="6" height="6" rx="1" fill="#0D1117"/><rect x="1" y="9" width="6" height="6" rx="1" fill="#0D1117"/><rect x="9" y="9" width="6" height="6" rx="1" fill="#0D1117"/></svg>';
}

function iconHouse() {
  return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
}

function iconBook() {
  return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
}

function iconChart() {
  return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>';
}

function iconPerson() {
  return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
}

function iconCheck() {
  return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
}

function iconDot() {
  return '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>';
}

function iconLock() {
  return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
}

function iconChevronLeft() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
}

function getTreeItemHTML(route, label, status) {
  if (status === 'completed') {
    return `<div class="tree-item done" data-route="${route}">${iconCheck()}<span>${label}</span></div>`;
  }
  if (status === 'in_progress') {
    return `<div class="tree-item active" data-route="${route}">${iconDot()}<span>${label}</span></div>`;
  }
  if (status === 'available') {
    return `<div class="tree-item" data-route="${route}">${iconDot()}<span>${label}</span></div>`;
  }
  return `<div class="tree-item locked" data-route="${route}">${iconLock()}<span>${label}</span></div>`;
}

function renderTreeHTML(topicIndex, progressMap) {
  const tierKeys = ['beginner', 'intermediate', 'advanced'];
  const tierColors = { beginner: 'var(--accent-green)', intermediate: '#BC8CFF', advanced: 'var(--accent-amber)' };
  const tiers = topicIndex && topicIndex.tiers ? topicIndex.tiers : {};
  const hasAnyProgress = Object.keys(progressMap).length > 0;
  let html = '<div class="nav-section-label">PYTHON</div>';

  for (const key of tierKeys) {
    const tier = tiers[key];
    if (!tier || !tier.topics || tier.topics.length === 0) continue;

    const isInactive = key !== 'beginner';
    html += `<div class="tier-header"><div class="tier-dot" style="background:${tierColors[key] || '#888'}"></div><span${isInactive ? ' style="color:var(--text-tertiary)"' : ''}>${tier.label}</span></div>`;

    tier.topics.forEach((topic, index) => {
      const topicId = topic.id;
      const dbStatus = progressMap[topicId];
      const hasFiles = !!topic.files;
      const isFirstBeginner = key === 'beginner' && index === 0;

      let status;
      if (dbStatus === 'completed') {
        status = 'completed';
      } else if (dbStatus === 'in_progress') {
        status = 'in_progress';
      } else if (dbStatus === 'available') {
        status = 'available';
      } else if (!hasFiles) {
        status = 'locked';
      } else if (!isTopicUnlocked(topic, progressMap)) {
        status = 'locked';
      } else if (isFirstBeginner && !hasAnyProgress) {
        status = 'in_progress';
      } else {
        status = 'available';
      }

      html += getTreeItemHTML(topicId, topic.title, status);
    });
  }

  return html;
}

export async function refreshSidebar() {
  const user = store.currentUser;
  if (!user) return;

  const treeEl = document.getElementById('js-sidebar-tree');
  if (!treeEl) return;

  let progressMap = {};
  try {
    const res = await window.electronAPI.getProgress(user.id);
    if (res.success) {
      for (const p of res.data) {
        progressMap[p.topic_id] = p.status || 'locked';
      }
    }
  } catch (e) {
    console.error('Failed to refresh sidebar progress:', e);
  }

  let topicIndex = null;
  try {
    const res = await window.electronAPI.getTopicIndex();
    if (res.success) topicIndex = res.data;
  } catch (e) {
    console.error('Failed to load topic index:', e);
  }

  treeEl.innerHTML = renderTreeHTML(topicIndex, progressMap);

  treeEl.querySelectorAll('.tree-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (item.classList.contains('locked')) return;
      e.stopPropagation();
      const route = item.dataset.route;
      if (route) {
        navigate(`#learn?topic=${route}`);
      }
    });
  });
}

export async function renderSidebar(user) {
  const sidebar = document.getElementById('js-sidebar');
  if (!sidebar) return;

  const xpInfo = getXPProgress(user.xp);

  let progressMap = {};
  try {
    const res = await window.electronAPI.getProgress(user.id);
    if (res.success) {
      for (const p of res.data) {
        progressMap[p.topic_id] = p.status || 'locked';
      }
    }
  } catch (e) {
    console.error('Failed to load sidebar progress:', e);
  }

  let topicIndex = null;
  try {
    const res = await window.electronAPI.getTopicIndex();
    if (res.success) topicIndex = res.data;
  } catch (e) {
    console.error('Failed to load topic index:', e);
  }

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">${iconGrid()}</div>
      <div class="logo-text">PyPath</div>
    </div>
    <div class="sidebar-profile" id="js-sidebar-profile">
      ${getAvatarHTML(user.avatar_id, 32)}
      <div class="profile-info">
        <div class="profile-name">${user.name}</div>
        <div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:${xpInfo.progress}%"></div></div>
        <div class="xp-label">${user.xp} / ${xpInfo.next} XP · Lv.${xpInfo.level}</div>
      </div>
      <div class="streak-badge">🔥 ${user.streak || 0}</div>
    </div>
    <div class="sidebar-nav">
      <div class="nav-section-label">NAVIGATE</div>
      <div class="nav-item active" data-route="#dashboard">${iconHouse()}<span>Dashboard</span></div>
      <div class="nav-item" data-route="#learn">${iconBook()}<span>Learn</span></div>
      <div class="nav-item" data-route="#progress">${iconChart()}<span>My Progress</span></div>
      <div class="nav-item" data-route="#profile">${iconPerson()}<span>Profile</span></div>
    </div>
    <div class="sidebar-tree" id="js-sidebar-tree">
      ${renderTreeHTML(topicIndex, progressMap)}
    </div>
    <div class="sidebar-collapse">
      <button id="js-collapse-btn" aria-label="Collapse sidebar">${iconChevronLeft()}</button>
    </div>
  `;

  // Nav item clicks
  sidebar.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      const route = item.dataset.route;
      if (route) {
        sidebar.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
        item.classList.add('active');
        navigate(route);
      }
    });
  });

  // Profile area click
  const profileArea = sidebar.querySelector('#js-sidebar-profile');
  if (profileArea) {
    profileArea.addEventListener('click', () => {
      sidebar.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
      const profileNav = sidebar.querySelector('.nav-item[data-route="#profile"]');
      if (profileNav) profileNav.classList.add('active');
      navigate('#profile');
    });
  }

  // Topic tree item clicks
  sidebar.querySelectorAll('.tree-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (item.classList.contains('locked')) return;
      e.stopPropagation();
      const route = item.dataset.route;
      if (route) {
        navigate(`#learn?topic=${route}`);
      }
    });
  });

  // Collapse button
  const collapseBtn = sidebar.querySelector('#js-collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      collapseBtn.innerHTML = isCollapsed
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
        : iconChevronLeft();
    });
  }
}
