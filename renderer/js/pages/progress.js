import store from '../store.js';
import { renderTopbar } from '../components/topbar.js';
import { findWeakTopics } from '../adaptiveLogic.js';
import { navigate } from '../router.js';

const TIER_COLORS = {
  beginner: 'var(--accent-green)',
  intermediate: '#BC8CFF',
  advanced: '#FFB800',
};

function countCompleted(tierTopics, progressData) {
  const total = tierTopics.length;
  const completed = progressData.filter((p) => {
    const topicIds = new Set(tierTopics.map((t) => t.id));
    return topicIds.has(p.topic_id) && p.status === 'completed';
  }).length;
  return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

function getStatusIcon(status, isLocked) {
  if (isLocked) return '\uD83D\uDD12';
  if (status === 'completed') return '\u2713';
  if (status === 'in_progress') return '\u25CF';
  return '\u25CB';
}

function getMetaText(topicProgress, isLocked) {
  if (isLocked) return 'Locked \u2014 complete prerequisites';
  if (!topicProgress) return 'Not started';
  const parts = [];
  if (topicProgress.quiz_score > 0) parts.push(`Quiz: ${topicProgress.quiz_score}%`);
  if (topicProgress.attempts > 0) parts.push(`${topicProgress.attempts} attempts`);
  return parts.length > 0 ? parts.join(' \u00B7 ') : 'In progress';
}

export async function render() {
  const currentUser = store.currentUser;
  if (!currentUser) {
    navigate('#splash');
    return;
  }

  renderTopbar('My Progress');

  const page = document.getElementById('js-page');
  if (!page) return;

  let progressData = [];
  let indexData = null;

  try {
    const [progressRes, indexRes] = await Promise.all([
      window.electronAPI.getProgress(currentUser.id),
      window.electronAPI.getTopicIndex(),
    ]);
    if (progressRes.success) progressData = progressRes.data;
    if (indexRes.success) indexData = indexRes.data;
  } catch (e) {
    console.error('Progress page data fetch error:', e);
  }

  const progressMap = {};
  for (const p of progressData) {
    progressMap[p.topic_id] = p;
  }

  const tiers = indexData ? indexData.tiers : {};
  const tierKeys = ['beginner', 'intermediate', 'advanced'];
  const weakTopics = findWeakTopics(progressData, indexData);

  let reviewHtml = '';
  if (weakTopics.length > 0) {
    reviewHtml = `
      <div class="review-section" style="max-width:900px;margin:0 auto;padding:0 var(--space-6);margin-bottom:var(--space-6)">
        <div class="section-title">Topics to Review</div>
        <div class="review-desc">You passed these topics but needed multiple attempts. Review the lesson to strengthen your understanding.</div>
        ${weakTopics.map((wt) => `
          <div class="review-topic-card" data-topic="${wt.topic_id}">
            <div class="review-topic-info">
              <div class="review-topic-title">${wt.title}</div>
              <div class="review-topic-attempts">${wt.attempts} attempts needed</div>
            </div>
            <button class="review-btn">Review \u2192</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  const tierSectionsHtml = tierKeys.map((key) => {
    const tier = tiers[key];
    if (!tier || !tier.topics || tier.topics.length === 0) return '';

    const stats = countCompleted(tier.topics, progressData);
    const color = TIER_COLORS[key] || 'var(--accent-green)';
    const progressBarColor = key === 'beginner' ? 'var(--accent-green)' : color;

    const topicsHtml = tier.topics.map((topic) => {
      const tp = progressMap[topic.id];
      const isDone = tp && tp.status === 'completed';
      const isInProgress = tp && tp.status === 'in_progress';
      const isAvailable = tp && tp.status === 'available';
      const hasFiles = !!topic.files;
      const isLocked = !hasFiles || (!isDone && !isInProgress && !isAvailable && !(key === 'beginner' && tier.topics.indexOf(topic) === 0 && !tp));

      let rowClass = 'progress-topic-row';
      if (isDone) rowClass += ' completed';
      else if (isInProgress || isAvailable) rowClass += ' in-progress';
      else if (isLocked) rowClass += ' locked';

      const icon = getStatusIcon(tp ? tp.status : null, isLocked);
      const meta = getMetaText(tp, isLocked);

      return `
        <div class="${rowClass}">
          <span style="font-size:14px;width:20px;text-align:center">${icon}</span>
          <span class="progress-topic-name">${topic.title}</span>
          <span class="progress-topic-meta">${meta}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="progress-tier-section">
        <div class="progress-tier-header">
          <div class="progress-tier-title" style="color:${color}">${tier.label}</div>
          <div class="progress-tier-percent">${stats.completed} / ${stats.total} completed (${stats.percent}%)</div>
        </div>
        <div class="progress-tier-bar-track">
          <div class="progress-tier-bar-fill" style="width:${stats.percent}%;background:${progressBarColor}"></div>
        </div>
        <div class="progress-topic-list">${topicsHtml}</div>
      </div>
    `;
  }).join('');

  page.innerHTML = `
    ${reviewHtml}
    <div class="progress-page">${tierSectionsHtml}</div>
  `;

  page.querySelectorAll('.review-topic-card').forEach((card) => {
    card.addEventListener('click', () => {
      const topicId = card.dataset.topic;
      if (topicId) navigate(`#learn?topic=${topicId}`);
    });
  });
}
