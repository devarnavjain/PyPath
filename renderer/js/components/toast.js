import store from '../store.js';

export function showBadgeToasts(badges) {
  if (!badges || badges.length === 0) return;

  badges.forEach((badge, i) => {
    setTimeout(() => {
      const toast = document.createElement('div');
      toast.className = 'badge-toast';
      toast.textContent = `\uD83C\uDFC6 Badge earned: ${badge.name}!`;
      document.body.appendChild(toast);

      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 3000);
    }, i * 800);
  });
}

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

function getLevel(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].xp) return XP_LEVELS[i];
  }
  return XP_LEVELS[0];
}

export async function awardXpAndCheckLevelUp(userId, amount, contextLabel) {
  const previousUser = store.currentUser;
  const prevXp = previousUser ? previousUser.xp : 0;
  const prevLevel = getLevel(prevXp);

  const result = await window.electronAPI.awardXP(userId, amount);
  const newXp = result.success ? result.data.xp : prevXp + amount;
  const newLevel = getLevel(newXp);

  if (previousUser) {
    previousUser.xp = newXp;
  }

  // Standard XP toast
  const xpToast = document.createElement('div');
  xpToast.className = 'lesson-done-toast';
  xpToast.textContent = `${contextLabel} +${amount} XP`;
  document.body.appendChild(xpToast);
  setTimeout(() => { if (xpToast.parentNode) xpToast.remove(); }, 1500);

  // Level-up toast
  if (newLevel.level > prevLevel.level) {
    setTimeout(() => {
      const lvlToast = document.createElement('div');
      lvlToast.className = 'level-up-toast';
      lvlToast.textContent = `\u26A1 Level up! You're now a ${newLevel.title}`;
      document.body.appendChild(lvlToast);
      setTimeout(() => { if (lvlToast.parentNode) lvlToast.remove(); }, 3000);
    }, 600);
  }

  return result;
}
