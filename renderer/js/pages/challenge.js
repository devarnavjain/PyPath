import store from '../store.js';
import { renderTopbar } from '../components/topbar.js';
import { navigate, onRouteCleanup, removeRouteCleanup } from '../router.js';
import { createEditor, disposeEditor, getEditorValue, setEditorValue } from '../components/editor.js';
import { refreshSidebar } from '../components/sidebar.js';
import { makeHorizontalSplit, makeVerticalSplit } from '../components/splitPanes.js';
import { isTopicUnlocked, getNextTopic } from '../adaptiveLogic.js';
import { checkAndAwardBadges } from '../badgeLogic.js';
import { awardXpAndCheckLevelUp, showBadgeToasts } from '../components/toast.js';

let currentEditor = null;
let splitCleanups = [];

const state = {
  topicId: null,
  tier: null,
  tierLabel: null,
  topicTitle: null,
  challenge: null,
  attempts: 0,
  hintsRevealed: 0,
  passed: false,
  lastReqFailures: null,
  lastExecutionTime: null,
  nextTopic: null,
};

export function cleanup() {
  if (currentEditor) {
    disposeEditor();
    currentEditor = null;
  }
  splitCleanups.forEach(fn => fn());
  splitCleanups = [];
  state.topicId = null;
  state.tier = null;
  state.tierLabel = null;
  state.topicTitle = null;
  state.challenge = null;
  state.attempts = 0;
  state.hintsRevealed = 0;
  state.passed = false;
  state.lastReqFailures = null;
  state.lastExecutionTime = null;
  state.nextTopic = null;
}

function findTopicMeta(tierMap, topicId) {
  for (const key of Object.keys(tierMap)) {
    const tier = tierMap[key];
    for (const topic of tier.topics) {
      if (topic.id === topicId) {
        return { tier: key, tierLabel: tier.label, topic };
      }
    }
  }
  return null;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function trimTrailing(str) {
  return str.replace(/[\s\u200b]+$/, '');
}

function buildEditorHTML(panel) {
  panel.innerHTML = [
    '<div class="editor-tabs">',
    '  <div class="editor-tab active">main.py</div>',
    '</div>',
    '<div class="editor-split-vertical" id="js-editor-split">',
    '  <div class="monaco-wrapper" id="js-monaco-container"></div>',
    '  <div class="output-panel">',
    '    <div class="editor-toolbar">',
    '      <button class="run-btn" id="js-run-btn">\u25b6 Run Code</button>',
    '      <button class="stop-btn" id="js-stop-btn" disabled>\u25a0 Stop</button>',
    '      <button class="check-answer-btn" id="js-check-btn">\u2713 Check Answer</button>',
    '      <span class="exec-time-label" id="js-exec-time"></span>',
    '    </div>',
    '    <div class="output-tabs">',
    '      <div class="output-tab active">Output</div>',
    '    </div>',
    '    <div class="output-content" id="js-output">',
    '      <div class="output-empty">Run your code to see output here</div>',
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n');
}

function wireEditorControls(leftPanel) {
  const runBtn = document.getElementById('js-run-btn');
  const stopBtn = document.getElementById('js-stop-btn');
  const checkBtn = document.getElementById('js-check-btn');
  const outputEl = document.getElementById('js-output');
  const execTimeLabel = document.getElementById('js-exec-time');

  function appendOutput(text, type) {
    const existing = outputEl.querySelector('.output-empty');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'output-line-' + type;
    div.textContent = text;
    outputEl.appendChild(div);
  }

  function clearOutput() {
    outputEl.innerHTML = '';
  }

  function setButtonsBusy(busy) {
    runBtn.disabled = busy;
    stopBtn.disabled = !busy;
    checkBtn.disabled = busy;
  }

  async function runCode() {
    setButtonsBusy(true);
    execTimeLabel.textContent = '';

    clearOutput();
    appendOutput('Running...', 'system');

    const code = getEditorValue();
    const result = await window.electronAPI.runCode(code);

    clearOutput();

    const output = result.data || {};
    const stdout = output.stdout || '';
    const stderr = output.stderr || '';
    const timedOut = output.timedOut || false;
    const executionTime = output.executionTime || 0;

    if (stderr) {
      stderr.split('\n').forEach(line => {
        if (line.trim()) appendOutput(line, 'stderr');
      });
    }

    if (stdout) {
      stdout.split('\n').forEach(line => {
        if (line.trim()) appendOutput(line, 'stdout');
      });
    }

    if (!stdout && !stderr) {
      appendOutput('(no output)', 'system');
    }

    if (timedOut) {
      appendOutput('\u23f1 Execution timed out (10s limit)', 'system');
      execTimeLabel.textContent = 'Failed in ' + executionTime + 'ms';
    } else if (stderr) {
      execTimeLabel.textContent = 'Failed in ' + executionTime + 'ms';
    } else {
      execTimeLabel.textContent = 'Completed in ' + executionTime + 'ms';
    }

    setButtonsBusy(false);
    return { stdout, stderr, timedOut, executionTime };
  }

  runBtn.addEventListener('click', runCode);

  stopBtn.addEventListener('click', async () => {
    await window.electronAPI.stopCode();
    clearOutput();
    appendOutput('\u25a0 Execution stopped', 'system');
    setButtonsBusy(false);
    execTimeLabel.textContent = '';
  });

  checkBtn.addEventListener('click', async () => {
    if (state.passed) return;
    checkBtn.disabled = true;
    state.lastReqFailures = null;

    const code = getEditorValue();
    const reqs = state.challenge.code_requirements;

    if (reqs && reqs.length > 0) {
      const failures = [];
      for (const req of reqs) {
        if (req.type === 'regex') {
          try {
            const re = new RegExp(req.pattern);
            if (!re.test(code)) {
              failures.push(req.fail_message || 'Requirement not met');
            }
          } catch (e) {
            failures.push('Invalid requirement: ' + (req.fail_message || req.pattern));
          }
        }
      }
      if (failures.length > 0) {
        state.attempts++;
        const cu = store.currentUser;
        if (cu) window.electronAPI.incrementAttempts(cu.id, state.topicId).catch(() => {});
        state.passed = false;
        state.lastReqFailures = failures;
        renderLeftPanel(leftPanel, false);
        checkBtn.disabled = false;
        return;
      }
    }

    const output = await runCode();
    state.attempts++;
    state.lastExecutionTime = output.executionTime || null;
    const cu = store.currentUser;
    if (cu) window.electronAPI.incrementAttempts(cu.id, state.topicId).catch(() => {});

    const actual = trimTrailing(output.stdout);
    const expected = trimTrailing(state.challenge.expected_output);
    const passed = actual === expected;
    state.passed = passed;

    if (passed) {
      const currentUser = store.currentUser;
      if (currentUser) {
        try {
          const next = await getNextTopic(currentUser.id);
          state.nextTopic = next && next.id !== state.topicId ? next : null;
        } catch (e) {
          state.nextTopic = null;
        }
      }
    }

    renderLeftPanel(leftPanel, passed);

    checkBtn.disabled = false;
  });

  checkPython();
}

function checkPython() {
  window.electronAPI.checkPython().then(result => {
    if (!result.success || !result.data.available) {
      const editorSide = document.querySelector('.challenge-editor-side');
      if (!editorSide) return;
      const banner = document.createElement('div');
      banner.className = 'python-missing-banner';
      banner.innerHTML = '<span class="python-missing-banner-icon">\u26a0</span> Python not found on this system. Install Python 3 and restart PyPath to run code. <a href="https://python.org" target="_blank" style="color:var(--accent-blue);text-decoration:underline;margin-left:auto;">Get it at python.org</a>';
      editorSide.insertBefore(banner, editorSide.firstChild);
    }
  }).catch(function () {});
}

function renderLeftPanel(container, lastResultPassed) {
  const ch = state.challenge;
  const hints = ch.hints || [];
  const hintBtnDisabled = state.attempts < 3 || state.hintsRevealed >= hints.length;

  let resultHtml = '';
  if (state.attempts > 0) {
    if (state.lastReqFailures && state.lastReqFailures.length > 0) {
      const items = state.lastReqFailures.map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join('');
      resultHtml = '<div class="challenge-result-banner fail reqs-fail">\u2717 Requirements not met<div class="challenge-requirements-fail-list"><ul>' + items + '</ul></div></div>';
    } else if (lastResultPassed) {
      resultHtml = '<div class="challenge-result-banner pass">\u2713 Correct! Great work.</div>';
    } else {
      resultHtml = '<div class="challenge-result-banner fail">\u2717 Not quite \u2014 check your output above and try again.</div>';
    }
  }

  let hintBtnHtml = '';
  if (hints.length > 0) {
    hintBtnHtml = '<button class="challenge-hint-btn" id="js-hint-btn"' + (hintBtnDisabled ? ' disabled' : '') + '>\ud83d\udca1 Show Hint</button>';
  }

  let hintsHtml = '';
  for (let i = 0; i < state.hintsRevealed && i < hints.length; i++) {
    hintsHtml += '<div class="challenge-hint-box"><p>\ud83d\udca1 ' + hints[i] + '</p></div>';
  }

  let completeHtml = '';
  if (state.passed) {
    completeHtml = '<button class="challenge-complete-btn" id="js-complete-btn">Mark Challenge Complete \u2192</button>';
    if (state.nextTopic) {
      completeHtml += '<button class="challenge-next-topic-btn" id="js-next-topic-btn">Next Topic \u2192</button>';
    }
  }

  container.innerHTML = [
    '<div class="challenge-label">CHALLENGE</div>',
    '<div class="challenge-title">' + escapeHtml(ch.title) + '</div>',
    '<div class="challenge-description">' + escapeHtml(ch.description) + '</div>',
    '<div class="challenge-expected-box">',
    '  <div class="challenge-expected-label">Expected Output</div>',
    '  <div class="challenge-expected-output">' + escapeHtml(ch.expected_output) + '</div>',
    '</div>',
    '<div class="challenge-attempts">Attempts: ' + state.attempts + '</div>',
    resultHtml,
    hintBtnHtml,
    hintsHtml,
    completeHtml,
  ].join('\n');

  if (!state.passed) {
    const hintBtn = document.getElementById('js-hint-btn');
    if (hintBtn && !hintBtn.disabled) {
      hintBtn.addEventListener('click', function () {
        state.hintsRevealed++;
        renderLeftPanel(container, lastResultPassed);
      });
    }
  }

  const completeBtn = document.getElementById('js-complete-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', function () { handleMarkComplete(); });
  }

  const nextBtn = document.getElementById('js-next-topic-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', handleNextTopic);
  }
}

async function handleMarkComplete(nextTopicId) {
  const currentUser = store.currentUser;
  if (!currentUser) return;

  const progressRes = await window.electronAPI.getProgress(currentUser.id);
  const topicProgress = progressRes.success
    ? progressRes.data.find(function (p) { return p.topic_id === state.topicId; })
    : null;
  const lessonDone = topicProgress ? topicProgress.lesson_done : 0;
  const quizScore = topicProgress ? topicProgress.quiz_score : 0;
  const newStatus = (lessonDone && quizScore >= 80) ? 'completed' : 'in_progress';

  await window.electronAPI.updateProgress(currentUser.id, state.topicId, {
    tier: state.tier,
    challenge_passed: 1,
    status: newStatus,
  });

  const xp = state.challenge.xp_reward || 25;
  const cu = store.currentUser;

  // Track no_hints: if user never clicked hint on this challenge
  if (state.hintsRevealed === 0 && cu) {
    const newCount = (cu.challenges_no_hints || 0) + 1;
    cu.challenges_no_hints = newCount;
    await window.electronAPI.updateUser(cu.id, { challenges_no_hints: newCount }).catch(() => {});
  }

  await awardXpAndCheckLevelUp(currentUser.id, xp, 'Challenge complete!');
  await refreshSidebar();

  if (newStatus === 'completed') {
    console.log('Topic fully completed:', state.topicId);
  }

  // Badge check — pass executionTime for speed_run
  const newBadges = await checkAndAwardBadges(currentUser.id, {
    executionTime: state.lastExecutionTime,
  });
  if (newBadges.length > 0) {
    showBadgeToasts(newBadges);
  }

  setTimeout(function () {
    if (nextTopicId) {
      navigate('#learn?topic=' + nextTopicId);
    } else {
      navigate('#dashboard');
    }
  }, nextTopicId ? 500 : 1500);
}

async function handleNextTopic() {
  const currentUser = store.currentUser;
  if (!currentUser || !state.nextTopic) return;

  const nextId = state.nextTopic.id;
  await handleMarkComplete(nextId);
}

export async function render(topicId) {
  const currentUser = store.currentUser;
  if (!currentUser) {
    navigate('#splash');
    return;
  }

  const page = document.getElementById('js-page');
  if (!page) return;

  if (!topicId) {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    topicId = params.get('topic');
  }

  if (!topicId) {
    page.innerHTML = '<div class="challenge-error">No topic specified.</div>';
    return;
  }

  removeRouteCleanup(cleanup);
  onRouteCleanup(cleanup);

  if (currentEditor) {
    disposeEditor();
    currentEditor = null;
  }

  page.innerHTML = '<div class="challenge-loading">Loading challenge...</div>';

  let challenge, indexData;
  try {
    const [challengeRes, indexRes] = await Promise.all([
      window.electronAPI.getChallenge(topicId),
      window.electronAPI.getTopicIndex(),
    ]);
    if (!challengeRes.success) {
      page.innerHTML = '<div class="challenge-error">Failed to load challenge: ' + escapeHtml(challengeRes.error) + '</div>';
      return;
    }
    challenge = challengeRes.data;
    indexData = indexRes.success ? indexRes.data : null;
  } catch (e) {
    page.innerHTML = '<div class="challenge-error">Failed to load challenge: ' + escapeHtml(e.message) + '</div>';
    return;
  }

  const tierMap = indexData ? indexData.tiers : {};
  const meta = findTopicMeta(tierMap, topicId);
  const tier = meta ? meta.tier : (topicId.split('.')[1] || '');
  const tierLabel = meta ? meta.tierLabel : (topicId.split('.')[1] || '');
  const topicTitle = meta ? meta.topic.title : '';

  // Prerequisite guard — redirect if topic is locked
  if (meta) {
    const progressGuard = await window.electronAPI.getProgress(currentUser.id);
    const guardMap = {};
    if (progressGuard.success) {
      for (const p of progressGuard.data) {
        guardMap[p.topic_id] = p.status;
      }
    }
    if (!isTopicUnlocked(meta.topic, guardMap)) {
      page.innerHTML = '<div class="challenge-error" style="text-align:center;padding:80px 20px"><div style="font-size:48px;margin-bottom:16px">🔒</div><div style="font-size:24px;color:var(--text-primary);font-family:var(--font-heading);font-weight:700;margin-bottom:8px">Topic Locked</div><div style="font-size:14px;color:var(--text-secondary)">Complete the prerequisite topics first</div></div>';
      setTimeout(() => navigate('#dashboard'), 2500);
      return;
    }
  }

  renderTopbar('Challenge', ['Python', tierLabel, topicTitle + ' Challenge']);

  state.topicId = topicId;
  state.tier = tier;
  state.tierLabel = tierLabel;
  state.topicTitle = topicTitle;
  state.challenge = challenge;
  state.attempts = 0;
  state.hintsRevealed = 0;
  state.passed = false;
  state.lastReqFailures = null;
  state.lastExecutionTime = null;

  page.innerHTML = '';

  const challengePage = document.createElement('div');
  challengePage.className = 'challenge-page';

  const leftPanel = document.createElement('div');
  leftPanel.className = 'challenge-panel';
  leftPanel.id = 'js-challenge-panel';

  const editorSide = document.createElement('div');
  editorSide.className = 'challenge-editor-side';
  editorSide.id = 'js-editor-side';

  challengePage.appendChild(leftPanel);
  challengePage.appendChild(editorSide);
  page.appendChild(challengePage);

  splitCleanups.push(makeHorizontalSplit(challengePage, leftPanel, editorSide, {
    minFirst: 320,
    minSecond: 320,
    initialRatio: 0.44,
  }));

  renderLeftPanel(leftPanel, false);

  buildEditorHTML(editorSide);

  const splitContainer = document.getElementById('js-editor-split');
  const monacoEl = document.getElementById('js-monaco-container');
  const outputEl = editorSide.querySelector('.output-panel');
  if (splitContainer && monacoEl && outputEl) {
    splitCleanups.push(makeVerticalSplit(splitContainer, monacoEl, outputEl, {
      minFirst: 150,
      minSecond: 80,
      initialRatio: 0.65,
    }));
  }

  wireEditorControls(leftPanel);

  currentEditor = await createEditor('js-monaco-container', { initialCode: challenge.starter_code || '' });
}
