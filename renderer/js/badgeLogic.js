const ALL_BADGES = [
  { id: 'first_lesson', name: 'First Steps' },
  { id: 'first_run', name: 'Hello World' },
  { id: 'first_pass', name: 'Sharp Mind' },
  { id: 'streak_3', name: 'On a Roll' },
  { id: 'streak_7', name: 'Week Warrior' },
  { id: 'streak_30', name: 'Monthly Master' },
  { id: 'all_beginner', name: 'Solid Foundation' },
  { id: 'all_intermediate', name: 'Rising Star' },
  { id: 'all_advanced', name: 'Python Master' },
  { id: 'speed_run', name: 'Speed Coder' },
  { id: 'no_hints', name: 'Self-Reliant' },
  { id: 'first_project', name: 'Builder' },
  { id: 'all_projects', name: 'Architect' },
];

const BADGE_MAP = Object.fromEntries(ALL_BADGES.map(b => [b.id, b.name]));

export const BADGE_INFO = {
  first_lesson:     'Complete your first lesson',
  first_run:        'Run Python code in the editor for the first time',
  first_pass:       'Pass your first quiz with 80% or higher',
  streak_3:         'Maintain a 3-day learning streak',
  streak_7:         'Maintain a 7-day learning streak',
  streak_30:        'Maintain a 30-day learning streak',
  all_beginner:     'Complete all 12 Beginner tier topics',
  all_intermediate: 'Complete all 12 Intermediate tier topics',
  all_advanced:     'Complete all 12 Advanced tier topics',
  speed_run:        'Pass a challenge in under 60 seconds',
  no_hints:         'Pass 10 challenges without using any hints',
  first_project:    'Complete the Beginner Capstone Project',
  all_projects:     'Complete all 36 topics across every tier',
};

export async function checkAndAwardBadges(userId, extraContext = {}) {
  const [progressRes, badgesRes, userRes, indexRes] = await Promise.all([
    window.electronAPI.getProgress(userId),
    window.electronAPI.getBadges(userId),
    window.electronAPI.getUser(userId),
    window.electronAPI.getTopicIndex(),
  ]);

  const progress = progressRes.success ? progressRes.data : [];
  const earnedBadges = badgesRes.success ? badgesRes.data.map(b => b.badge_id) : [];
  const user = userRes.success ? userRes.data : null;
  const indexData = indexRes.success ? indexRes.data : null;

  const newBadges = [];

  function already(badgeId) {
    return earnedBadges.includes(badgeId);
  }

  const tiers = indexData ? indexData.tiers : {};

  function countCompletedInTier(tierKey) {
    const tier = tiers[tierKey];
    if (!tier) return false;
    const topicIds = new Set(tier.topics.map(t => t.id));
    const tierProgress = progress.filter(p => topicIds.has(p.topic_id));
    return tierProgress.length >= tier.topics.length && tierProgress.every(p => p.status === 'completed');
  }

  const conditions = [
    {
      id: 'first_lesson',
      check: () => progress.some(p => p.lesson_done === 1),
    },
    {
      id: 'first_run',
      check: () => user && user.code_runs > 0,
    },
    {
      id: 'first_pass',
      check: () => progress.some(p => p.quiz_score >= 80),
    },
    {
      id: 'streak_3',
      check: () => user && user.streak >= 3,
    },
    {
      id: 'streak_7',
      check: () => user && user.streak >= 7,
    },
    {
      id: 'streak_30',
      check: () => user && user.streak >= 30,
    },
    {
      id: 'all_beginner',
      check: () => countCompletedInTier('beginner'),
    },
    {
      id: 'all_intermediate',
      check: () => countCompletedInTier('intermediate'),
    },
    {
      id: 'all_advanced',
      check: () => countCompletedInTier('advanced'),
    },
    {
      id: 'speed_run',
      check: () => extraContext.executionTime != null && extraContext.executionTime < 60000,
    },
    {
      id: 'no_hints',
      check: () => user && user.challenges_no_hints >= 10,
    },
    {
      id: 'first_project',
      check: () => {
        const capstone = progress.find(p => p.topic_id === 'python.beginner.capstone');
        return capstone && capstone.status === 'completed';
      },
    },
    {
      id: 'all_projects',
      check: () => {
        const totalTopics = Object.values(tiers).reduce((sum, t) => sum + (t.topics ? t.topics.length : 0), 0);
        const completed = progress.filter(p => p.status === 'completed').length;
        return completed >= totalTopics;
      },
    },
  ];

  for (const cond of conditions) {
    if (!already(cond.id) && cond.check()) {
      await window.electronAPI.awardBadge(userId, cond.id);
      newBadges.push({ id: cond.id, name: BADGE_MAP[cond.id] || cond.id });
    }
  }

  return newBadges;
}
