import store from '../store.js';
import { renderTopbar } from '../components/topbar.js';
import { refreshSidebar } from '../components/sidebar.js';
import { navigate, onRouteCleanup, removeRouteCleanup } from '../router.js';
import { createEditor, disposeEditor, getEditorValue, setEditorValue } from '../components/editor.js';
import { makeHorizontalSplit, makeVerticalSplit } from '../components/splitPanes.js';
import { isTopicUnlocked } from '../adaptiveLogic.js';
import { checkAndAwardBadges } from '../badgeLogic.js';
import { awardXpAndCheckLevelUp, showBadgeToasts } from '../components/toast.js';

let currentEditor = null;
let currentTopicId = null;
let splitCleanups = [];

function groupSteps(steps) {
  const groups = [];
  let current = [];
  for (const step of steps) {
    if (step.type === 'heading' && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(step);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function highlightPython(code) {
  const kw = '\\b(def|print|return|if|for|while|import|from|class|True|False|None|and|or|not|in|is|elif|else|try|except|finally|with|as|pass|break|continue|raise|lambda|yield|async|await)\\b';
  const reKw = new RegExp(kw, 'g');
  const reStr = /('[^']*'|"[^"]*")/g;

  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split('\n');
  return lines.map(line => {
    let commentIdx = -1;
    let inSingle = false, inDouble = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (ch === '#' && !inSingle && !inDouble) {
        commentIdx = i;
        break;
      }
    }

    if (commentIdx >= 0) {
      const codePart = line.substring(0, commentIdx);
      const commentPart = line.substring(commentIdx);
      let highlighted = codePart.replace(reStr, '<span style="color:var(--accent-blue)">$1</span>');
      highlighted = highlighted.replace(reKw, '<span style="color:#F97583">$1</span>');
      return highlighted + '<span style="color:var(--text-tertiary)">' + commentPart + '</span>';
    }

    line = line.replace(reStr, '<span style="color:var(--accent-blue)">$1</span>');
    line = line.replace(reKw, '<span style="color:#F97583">$1</span>');
    return line;
  }).join('\n');
}

function formatParagraph(text) {
  let html = text
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, '<code>$2</code>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  return html;
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

function renderBlock(block) {
  switch (block.type) {
    case 'heading':
      return `<h2 class="block-heading">${block.content}</h2>`;

    case 'paragraph':
      return `<p class="block-paragraph">${formatParagraph(block.content)}</p>`;

    case 'code': {
      const highlighted = highlightPython(block.content);
      const codeAttr = encodeURIComponent(block.content);
      const runBtn = block.runnable
        ? `<button class="block-code-run-btn" data-code="${codeAttr}">▶ Try this example</button>`
        : '';
      return '<div class="block-code"><span class="block-code-lang-tag">' + (block.language || 'python') + '</span>' + highlighted + '</div>\n' + runBtn;
    }

    case 'callout': {
      const icons = { tip: '💡', info: 'ℹ️', warning: '⚠️' };
      const icon = icons[block.variant] || 'ℹ️';
      const variantClass = `block-callout-${block.variant || 'info'}`;
      return `
        <div class="block-callout ${variantClass}">
          <span>${icon}</span>
          <p>${formatParagraph(block.content)}</p>
        </div>
      `;
    }

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items.map(item => {
        const formatted = item
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        return `<li>${formatted}</li>`;
      }).join('');
      return `<${tag} class="block-list">${items}</${tag}>`;
    }

    default:
      return `<p class="block-paragraph">${block.content || ''}</p>`;
  }
}

export function cleanup() {
  if (currentEditor) {
    disposeEditor();
    currentEditor = null;
  }
  currentTopicId = null;
  splitCleanups.forEach(fn => fn());
  splitCleanups = [];
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
    page.innerHTML = `
      <div class="lesson-empty">
        <div class="lesson-empty-icon">📖</div>
        <div class="lesson-empty-title">Select a Topic</div>
        <div class="lesson-empty-sub">Choose a topic from the sidebar to start learning</div>
      </div>
    `;
    return;
  }

  removeRouteCleanup(cleanup);
  onRouteCleanup(cleanup);

  if (currentTopicId !== topicId && currentEditor) {
    disposeEditor();
    currentEditor = null;
  }
  currentTopicId = topicId;

  renderTopbar('Learn', ['Python', 'Lesson']);

  page.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-tertiary)">Loading lesson...</div>';

  let lesson, indexData;
  try {
    const [lessonRes, indexRes] = await Promise.all([
      window.electronAPI.getLesson(topicId),
      window.electronAPI.getTopicIndex(),
    ]);
    if (!lessonRes.success) {
      page.innerHTML = `<div class="lesson-error">Failed to load lesson: ${lessonRes.error}</div>`;
      return;
    }
    lesson = lessonRes.data;
    indexData = indexRes.success ? indexRes.data : null;
  } catch (e) {
    page.innerHTML = `<div class="lesson-error">Failed to load lesson: ${e.message}</div>`;
    return;
  }

  const tierMap = indexData ? indexData.tiers : {};
  const meta = findTopicMeta(tierMap, topicId);
  const tierLabel = meta ? meta.tierLabel : (topicId.split('.')[1] || '');
  const topicTitle = meta ? meta.topic.title : lesson.title;

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
      page.innerHTML = '<div class="lesson-error" style="text-align:center;padding:80px 20px"><div style="font-size:48px;margin-bottom:16px">🔒</div><div style="font-size:24px;color:var(--text-primary);font-family:var(--font-heading);font-weight:700;margin-bottom:8px">Topic Locked</div><div style="font-size:14px;color:var(--text-secondary)">Complete the prerequisite topics first</div></div>';
      setTimeout(() => navigate('#dashboard'), 2500);
      return;
    }
  }

  renderTopbar('Learn', ['Python', tierLabel, topicTitle]);

  const stepGroups = groupSteps(lesson.steps || []);
  const totalSteps = stepGroups.length;

  let currentStep = 0;
  let isDone = false;

  const lessonPanel = document.createElement('div');
  lessonPanel.className = 'lesson-panel';
  lessonPanel.id = 'js-lesson-panel';

  const editorPanel = document.createElement('div');
  editorPanel.className = 'editor-container';
  editorPanel.id = 'js-editor-panel';

  page.innerHTML = '';
  const lessonPage = document.createElement('div');
  lessonPage.className = 'lesson-page';
  lessonPage.appendChild(lessonPanel);
  lessonPage.appendChild(editorPanel);
  page.appendChild(lessonPage);
  splitCleanups.push(makeHorizontalSplit(lessonPage, lessonPanel, editorPanel, {
    minFirst: 320,
    minSecond: 320,
    initialRatio: 0.5,
  }));

  function buildEditorHTML() {
    editorPanel.innerHTML = `
      <div class="editor-tabs">
        <div class="editor-tab active">main.py</div>
      </div>
      <div class="editor-split-vertical" id="js-editor-split">
        <div class="monaco-wrapper" id="js-monaco-container"></div>
        <div class="output-panel">
          <div class="editor-toolbar">
            <button class="run-btn" id="js-run-btn">▶ Run Code</button>
            <button class="stop-btn" id="js-stop-btn" disabled>■ Stop</button>
            <span class="exec-time-label" id="js-exec-time"></span>
          </div>
          <div class="output-tabs">
            <div class="output-tab active">Output</div>
          </div>
          <div class="output-content" id="js-output">
            <div class="output-empty">Run your code to see output here</div>
          </div>
        </div>
      </div>
    `;
  }

  function updateStepContent() {
    const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
    const isLastStep = currentStep === totalSteps - 1;

    const blocksHtml = stepGroups[currentStep].map(block => renderBlock(block)).join('');

    const navHtml = `
      <div>
        <button class="lesson-nav-btn" id="js-prev-btn" ${currentStep === 0 ? 'disabled' : ''}>← Previous</button>
        ${isLastStep
          ? `<button class="lesson-done-btn" id="js-done-btn">Mark as Done ✓</button>`
          : `<button class="lesson-nav-btn" id="js-next-btn">Next →</button>`
        }
      </div>
    `;

    lessonPanel.innerHTML = `
      <div class="lesson-progress-bar">
        <div class="lesson-progress-fill" style="width:${progress}%"></div>
      </div>
      <div class="lesson-step-label">Step ${currentStep + 1} of ${totalSteps}</div>
      <div class="lesson-steps" id="js-lesson-steps">${blocksHtml}</div>
      <div class="lesson-footer">${navHtml}</div>
    `;

    attachStepEvents(isLastStep, isDone);
    attachCodeRunButtons();
  }

  function attachStepEvents(isLastStep, done) {
    const prevBtn = document.getElementById('js-prev-btn');
    const nextBtn = document.getElementById('js-next-btn');
    const doneBtn = document.getElementById('js-done-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
          currentStep--;
          updateStepContent();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentStep < totalSteps - 1) {
          currentStep++;
          updateStepContent();
        }
      });
    }

    if (doneBtn && !done) {
      doneBtn.addEventListener('click', handleMarkDone);
    }
  }

  function attachCodeRunButtons() {
    document.querySelectorAll('.block-code-run-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = decodeURIComponent(btn.dataset.code);
        setEditorValue(code);
      });
    });
  }

  async function handleMarkDone() {
    if (isDone) return;
    isDone = true;

    const doneBtn = document.getElementById('js-done-btn');
    if (doneBtn) {
      doneBtn.disabled = true;
      doneBtn.textContent = '✓ Completed!';
    }

    const tier = topicId.split('.')[1];
    const xpAmount = lesson.xp_reward || 10;

    try {
      await window.electronAPI.updateProgress(currentUser.id, topicId, {
        lesson_done: 1,
        status: 'in_progress',
        tier,
      });

      await awardXpAndCheckLevelUp(currentUser.id, xpAmount, 'Lesson complete!');
      await refreshSidebar();

      // Badge check
      const newBadges = await checkAndAwardBadges(currentUser.id, {});
      if (newBadges.length > 0) {
        showBadgeToasts(newBadges);
      }

      setTimeout(() => {
        navigate(`#quiz?topic=${topicId}`);
      }, 1500);
    } catch (e) {
      console.error('Failed to mark lesson done:', e);
      isDone = false;
      if (doneBtn) {
        doneBtn.disabled = false;
        doneBtn.textContent = 'Mark as Done ✓';
      }
    }
  }

  function wireEditorControls() {
    const runBtn = document.getElementById('js-run-btn');
    const stopBtn = document.getElementById('js-stop-btn');
    const outputEl = document.getElementById('js-output');
    const execTimeLabel = document.getElementById('js-exec-time');

    function setOutput(text, type) {
      outputEl.innerHTML = `<div class="output-line-${type}">${escapeHtml(text)}</div>`;
    }

    function appendOutput(text, type) {
      const existing = outputEl.querySelector('.output-empty');
      if (existing) existing.remove();
      const div = document.createElement('div');
      div.className = `output-line-${type}`;
      div.textContent = text;
      outputEl.appendChild(div);
    }

    function clearOutput() {
      outputEl.innerHTML = '';
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true;
      stopBtn.disabled = false;
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
        const lines = stderr.split('\n');
        lines.forEach(line => {
          if (line.trim()) appendOutput(line, 'stderr');
        });
      }

      if (stdout) {
        const lines = stdout.split('\n');
        lines.forEach(line => {
          if (line.trim()) appendOutput(line, 'stdout');
        });
      }

      if (!stdout && !stderr) {
        appendOutput('(no output)', 'system');
      }

      if (timedOut) {
        appendOutput('⏱ Execution timed out (10s limit)', 'system');
        execTimeLabel.textContent = `Failed in ${executionTime}ms`;
      } else if (stderr) {
        execTimeLabel.textContent = `Failed in ${executionTime}ms`;
      } else {
        execTimeLabel.textContent = `Completed in ${executionTime}ms`;
      }

      // Track successful code runs for first_run badge
      if (!stderr && !timedOut && currentUser) {
        const currentUserLocal = store.currentUser;
        if (currentUserLocal) {
          const newCount = (currentUserLocal.code_runs || 0) + 1;
          currentUserLocal.code_runs = newCount;
          window.electronAPI.updateUser(currentUserLocal.id, { code_runs: newCount }).catch(() => {});
        }
      }

      runBtn.disabled = false;
      stopBtn.disabled = true;
    });

    stopBtn.addEventListener('click', async () => {
      await window.electronAPI.stopCode();
      clearOutput();
      appendOutput('■ Execution stopped', 'system');
      runBtn.disabled = false;
      stopBtn.disabled = true;
      execTimeLabel.textContent = '';
    });
  }

  function checkPython() {
    const editorPanelEl = document.getElementById('js-editor-panel');
    window.electronAPI.checkPython().then(result => {
      if (!result.success || !result.data.available) {
        const banner = document.createElement('div');
        banner.className = 'python-missing-banner';
        banner.innerHTML = '<span class="python-missing-banner-icon">⚠</span> Python not found on this system. Install Python 3 and restart PyPath to run code. <a href="https://python.org" target="_blank" style="color:var(--accent-blue);text-decoration:underline;margin-left:auto;">Get it at python.org</a>';
        editorPanelEl.insertBefore(banner, editorPanelEl.firstChild);
      }
    }).catch(() => {});
  }

  buildEditorHTML();
  const splitContainer = document.getElementById('js-editor-split');
  const monacoEl = document.getElementById('js-monaco-container');
  const outputEl = document.querySelector('.output-panel');
  if (splitContainer && monacoEl && outputEl) {
    splitCleanups.push(makeVerticalSplit(splitContainer, monacoEl, outputEl, {
      minFirst: 150,
      minSecond: 80,
      initialRatio: 0.65,
    }));
  }

  updateStepContent();
  wireEditorControls();
  checkPython();

  if (currentEditor) {
    disposeEditor();
    currentEditor = null;
  }
  currentEditor = await createEditor('js-monaco-container', { initialCode: '' });
}
