import store from '../store.js';
import { renderTopbar } from '../components/topbar.js';
import { navigate } from '../router.js';
import { findWeakTopics, getNextTopic } from '../adaptiveLogic.js';
import { BADGE_INFO } from '../badgeLogic.js';

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

const ALL_BADGES = [
  { id: 'first_lesson', name: 'First Steps', icon: '📖' },
  { id: 'first_run', name: 'Hello World', icon: '💻' },
  { id: 'first_pass', name: 'Sharp Mind', icon: '🧠' },
  { id: 'streak_3', name: 'On a Roll', icon: '🔥' },
  { id: 'streak_7', name: 'Week Warrior', icon: '⚔️' },
  { id: 'streak_30', name: 'Monthly Master', icon: '📅' },
  { id: 'all_beginner', name: 'Solid Foundation', icon: '🏗️' },
  { id: 'all_intermediate', name: 'Rising Star', icon: '⭐' },
  { id: 'all_advanced', name: 'Python Master', icon: '🐍' },
  { id: 'speed_run', name: 'Speed Coder', icon: '⚡' },
  { id: 'no_hints', name: 'Self-Reliant', icon: '💪' },
  { id: 'first_project', name: 'Builder', icon: '🔨' },
  { id: 'all_projects', name: 'Architect', icon: '🏛️' },
];

function getXPInfo(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].xp) {
      const current = XP_LEVELS[i];
      const next = XP_LEVELS[i + 1] || XP_LEVELS[i];
      const range = next.xp - current.xp;
      const progress = range > 0 ? ((xp - current.xp) / range) * 100 : 100;
      return {
        level: current.level,
        title: current.title,
        currentXp: xp,
        levelMinXp: current.xp,
        nextLevelXp: next.xp,
        progress: Math.min(progress, 100),
      };
    }
  }
  return { level: 1, title: 'Newbie', currentXp: 0, levelMinXp: 0, nextLevelXp: 100, progress: 0 };
}

function countByTier(tierData, progressData) {
  const total = tierData.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = progressData.filter((p) => {
    const tierMatch = p.tier === tierData[0].id.split('.')[1];
    return tierMatch && p.status === 'completed';
  }).length;
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

export async function render() {
  const currentUser = store.currentUser;
  if (!currentUser) {
    navigate('#splash');
    return;
  }

  const user = currentUser;
  renderTopbar('Dashboard');

  const page = document.getElementById('js-page');
  if (!page) return;

  const xpInfo = getXPInfo(user.xp || 0);
  const streak = user.streak || 0;

  let progressData = [];
  let badgeData = [];
  let indexData = null;

  try {
    const [progressRes, badgesRes, indexRes] = await Promise.all([
      window.electronAPI.getProgress(user.id),
      window.electronAPI.getBadges(user.id),
      window.electronAPI.getTopicIndex(),
    ]);
    if (progressRes.success) progressData = progressRes.data;
    if (badgesRes.success) badgeData = badgesRes.data;
    if (indexRes.success) indexData = indexRes.data;
  } catch (e) {
    console.error('Dashboard data fetch error:', e);
  }

  const tierKeys = indexData ? Object.keys(indexData.tiers) : [];
  const tierMap = indexData ? indexData.tiers : {};

  const completedTopics = progressData.filter((p) => p.status === 'completed').length;
  const earnedBadgeIds = new Set(badgeData.map((b) => b.badge_id));
  const badgeDateMap = {};
  for (const b of badgeData) {
    badgeDateMap[b.badge_id] = b.earned_at;
  }

  const tierStats = {};
  for (const key of tierKeys) {
    const tier = tierMap[key];
    tierStats[key] = countByTier(tier.topics, progressData);
  }

  const continueTopic = await getNextTopic(currentUser.id);
  const isFirstTime = progressData.length === 0;
  const allComplete = !continueTopic && progressData.length > 0;

  const weakTopics = findWeakTopics(progressData, indexData);

  const tierColors = { beginner: 'var(--accent-green)', intermediate: '#BC8CFF', advanced: '#FFB800' };

  page.innerHTML = `
    <div class="dashboard-welcome">
      <div>
        <div class="welcome-text">Welcome back, ${user.name} 👋</div>
        <div class="welcome-sub">Ready to level up your Python?</div>
      </div>
      <div class="streak-pill">${streak > 0 ? `🔥 ${streak} day streak` : '🔥 Start your streak today!'}</div>
    </div>

    <div class="xp-card">
      <div class="xp-card-top">
        <div class="xp-level-badge">Lv.${xpInfo.level} · ${xpInfo.title}</div>
        <div class="xp-numbers">${xpInfo.currentXp} / ${xpInfo.nextLevelXp} XP</div>
      </div>
      <div class="xp-bar-track"><div class="xp-bar-progress" style="width:${xpInfo.progress}%"></div></div>
    </div>

    ${allComplete ? `
    <div class="continue-card" id="js-continue-card">
      <div class="continue-label" style="color:var(--accent-amber);font-size:14px;">🎉 ALL CAUGHT UP!</div>
      <div class="continue-title">You've completed all available topics</div>
      <div class="continue-desc">Great work! Check back for new content or review past lessons.</div>
    </div>
    ` : `
    <div class="continue-card" id="js-continue-card">
      <div class="continue-label">${isFirstTime ? 'GET STARTED' : 'CONTINUE LEARNING'}</div>
      <div class="continue-title">${continueTopic ? continueTopic.title : 'Introduction to Python'}</div>
      <div class="continue-desc">${continueTopic ? continueTopic.description : 'Begin your Python journey here'}</div>
      <button class="continue-btn">${isFirstTime ? 'Start Learning →' : 'Resume →'}</button>
    </div>
    `}

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${completedTopics}</div>
        <div class="stat-label">Topics<br>Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${streak}</div>
        <div class="stat-label">Day<br>Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${badgeData.length} / 13</div>
        <div class="stat-label">Badges<br>Earned</div>
      </div>
    </div>

    <div class="badges-shelf">
      <div class="section-title">Badges</div>
      <div class="badges-row">
        ${ALL_BADGES.map((b) => {
          const earned = earnedBadgeIds.has(b.id);
          const desc = BADGE_INFO[b.id] || '';
          const date = badgeDateMap[b.id];
          const dateStr = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          const tooltipText = earned && dateStr ? `${desc}\nEarned ${dateStr}` : desc;
          return `
              <div class="badge-tooltip-wrap">
                <div class="badge-chip ${earned ? 'earned' : 'locked'}">${earned ? b.icon : '🔒'} ${b.name}</div>
                <span class="badge-tooltip">${tooltipText}</span>
              </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="topic-overview">
      <div class="section-title">Your Path</div>
      ${tierKeys.map((key) => {
        const tier = tierMap[key];
        const stat = tierStats[key];
        const color = tierColors[key] || 'var(--accent-green)';
        return `
          <div class="tier-row">
            <div class="tier-name">${tier.label}</div>
            <div class="tier-progress-track"><div class="tier-progress-fill" style="width:${stat.percent}%;background:${color}"></div></div>
            <div class="tier-percent">${stat.percent}%</div>
          </div>
        `;
      }).join('')}
    </div>

    ${weakTopics.length > 0 ? `
    <div class="review-section">
      <div class="section-title">Topics to Review</div>
      <div class="review-desc">You passed these topics but needed multiple attempts. Review the lesson to strengthen your understanding.</div>
      ${weakTopics.map(wt => `
        <div class="review-topic-card" data-topic="${wt.topic_id}">
          <div class="review-topic-info">
            <div class="review-topic-title">${wt.title}</div>
            <div class="review-topic-attempts">${wt.attempts} attempts needed</div>
          </div>
          <button class="review-btn">Review →</button>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `;

  const continueCard = page.querySelector('#js-continue-card');
  if (continueCard && !allComplete) {
    continueCard.addEventListener('click', () => {
      const id = continueTopic ? continueTopic.id : 'python.beginner.introduction';
      navigate(`#learn?topic=${id}`);
    });
  }

  // Review topic cards
  page.querySelectorAll('.review-topic-card').forEach(card => {
    card.addEventListener('click', () => {
      const topicId = card.dataset.topic;
      if (topicId) navigate(`#learn?topic=${topicId}`);
    });
  });

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
