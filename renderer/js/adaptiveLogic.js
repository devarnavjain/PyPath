/**
 * Check if a topic is unlocked for the current user.
 * A topic is unlocked iff:
 *   1. It has a "files" field (content exists), AND
 *   2. All prerequisites are satisfied (each prerequisite topic has status === 'completed')
 *
 * @param {object} topic - The topic object from the topic index
 * @param {object} progressMap - A map of topicId → status string (e.g. 'completed', 'locked')
 * @returns {boolean}
 */
export function isTopicUnlocked(topic, progressMap) {
  if (!topic.files) return false;

  const prereqs = topic.prerequisites || [];
  for (const prereqId of prereqs) {
    if (progressMap[prereqId] !== 'completed') return false;
  }

  return true;
}

/**
 * Find the next available topic for a user (first non-completed, unlocked topic with content).
 * Walks topics in curriculum order: beginner → intermediate → advanced.
 *
 * @param {number} userId - The user's ID
 * @returns {Promise<object|null>} - The next topic object, or null if all topics completed
 */
export async function getNextTopic(userId) {
  const [progressResult, indexResult] = await Promise.all([
    window.electronAPI.getProgress(userId),
    window.electronAPI.getTopicIndex(),
  ]);

  const progress = progressResult.success ? progressResult.data : [];
  const index = indexResult.success ? indexResult.data : null;

  if (!index) return null;

  const progressMap = {};
  for (const p of progress) {
    progressMap[p.topic_id] = p.status || 'locked';
  }

  const tiers = ['beginner', 'intermediate', 'advanced'];
  for (const tier of tiers) {
    const topics = index.tiers[tier]?.topics || [];
    for (const topic of topics) {
      const status = progressMap[topic.id];
      if (status === 'completed') continue;
      if (!topic.files || !topic.files.lesson) continue;
      if (!isTopicUnlocked(topic, progressMap)) continue;
      return topic;
    }
  }
  return null;
}

/**
 * Find weak topics for the review section.
 * A topic is "weak" if status === 'completed' AND attempts >= 3.
 *
 * @param {Array} progressData - Raw progress array from DB (each row has topic_id, status, attempts, etc.)
 * @param {object} topicIndex - The full topic index object with tiers
 * @returns {Array} - Array of { topic_id, title, attempts } objects
 */
export function findWeakTopics(progressData, topicIndex) {
  const topicLookup = {};
  if (topicIndex && topicIndex.tiers) {
    for (const tier of Object.values(topicIndex.tiers)) {
      for (const topic of tier.topics) {
        topicLookup[topic.id] = topic;
      }
    }
  }

  return progressData
    .filter(p => p.status === 'completed' && p.attempts >= 3)
    .map(p => {
      const topic = topicLookup[p.topic_id] || null;
      return topic ? { topic_id: p.topic_id, title: topic.title, attempts: p.attempts, topic } : null;
    })
    .filter(Boolean);
}
