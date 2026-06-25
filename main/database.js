const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'pypath.db');

let db;

function init() {
  try {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        avatar_id   INTEGER DEFAULT 1,
        xp          INTEGER DEFAULT 0,
        streak      INTEGER DEFAULT 0,
        last_active TEXT,
        theme       TEXT DEFAULT 'dark',
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS progress (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        topic_id    TEXT NOT NULL,
        tier        TEXT NOT NULL,
        status      TEXT DEFAULT 'locked',
        lesson_done INTEGER DEFAULT 0,
        quiz_score  INTEGER DEFAULT 0,
        challenge_passed INTEGER DEFAULT 0,
        attempts    INTEGER DEFAULT 0,
        completed_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, topic_id)
      );

      CREATE TABLE IF NOT EXISTS badges (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        badge_id    TEXT NOT NULL,
        earned_at   TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, badge_id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        date        TEXT NOT NULL,
        duration_sec INTEGER DEFAULT 0,
        xp_earned   INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, date)
      );
    `);

    // Migration: add tracking columns for badges
    try { db.exec("ALTER TABLE users ADD COLUMN code_runs INTEGER DEFAULT 0"); } catch (e) {}
    try { db.exec("ALTER TABLE users ADD COLUMN challenges_no_hints INTEGER DEFAULT 0"); } catch (e) {}

    console.log('Database initialized');
    return db;
  } catch (err) {
    console.error('Database failed to open:', err);
    throw err;
  }
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getAllUsers() {
  return db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
}

function createUser(name, avatarId) {
  const info = db.prepare('INSERT INTO users (name, avatar_id) VALUES (?, ?)').run(name, avatarId);
  return getUserById(info.lastInsertRowid);
}

function updateUser(id, fields) {
  const sets = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  db.prepare(`UPDATE users SET ${sets} WHERE id = ?`).run(...values, id);
}

function getProgress(userId) {
  return db.prepare('SELECT * FROM progress WHERE user_id = ?').all(userId);
}

function upsertProgress(userId, topicId, tier, fields) {
  const existing = db.prepare(
    'SELECT * FROM progress WHERE user_id = ? AND topic_id = ?'
  ).get(userId, topicId);

  if (existing) {
    const keys = Object.keys(fields);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);
    db.prepare(
      `UPDATE progress SET ${setClause} WHERE user_id = ? AND topic_id = ?`
    ).run(...values, userId, topicId);
  } else {
    db.prepare(`
      INSERT INTO progress (user_id, topic_id, tier, status,
        lesson_done, quiz_score, challenge_passed, attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, topicId, tier,
      fields.status || 'available',
      fields.lesson_done || 0,
      fields.quiz_score || 0,
      fields.challenge_passed || 0,
      fields.attempts || 0
    );
  }
}

function awardXP(userId, amount) {
  db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(amount, userId);
  const user = getUserById(userId);
  return user.xp;
}

function getBadges(userId) {
  return db.prepare('SELECT * FROM badges WHERE user_id = ?').all(userId);
}

function awardBadge(userId, badgeId) {
  db.prepare('INSERT OR IGNORE INTO badges (user_id, badge_id) VALUES (?, ?)').run(userId, badgeId);
}

function incrementAttempts(userId, topicId) {
  const existing = db.prepare(
    'SELECT * FROM progress WHERE user_id = ? AND topic_id = ?'
  ).get(userId, topicId);
  if (existing) {
    db.prepare(
      'UPDATE progress SET attempts = attempts + 1 WHERE user_id = ? AND topic_id = ?'
    ).run(userId, topicId);
  } else {
    // No progress row yet — create one with attempts=1
    const tier = topicId.split('.')[1] || 'beginner';
    db.prepare(`
      INSERT INTO progress (user_id, topic_id, tier, status, attempts)
      VALUES (?, ?, ?, 'available', 1)
    `).run(userId, topicId, tier);
  }
}

function deleteUser(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM badges WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM progress WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return { deleted: true };
}

function upsertSession(userId, date, durationSec, xpEarned) {
  db.prepare(`
    INSERT INTO sessions (user_id, date, duration_sec, xp_earned)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      duration_sec = COALESCE(EXCLUDED.duration_sec, duration_sec),
      xp_earned = COALESCE(EXCLUDED.xp_earned, xp_earned)
  `).run(userId, date, durationSec ?? 0, xpEarned ?? 0);
}

init();

module.exports = {
  db,
  init,
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getProgress,
  upsertProgress,
  awardXP,
  getBadges,
  awardBadge,
  incrementAttempts,
  upsertSession,
};
