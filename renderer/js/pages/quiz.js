import store from '../store.js';
import { renderTopbar } from '../components/topbar.js';
import { navigate, onRouteCleanup, removeRouteCleanup } from '../router.js';
import { refreshSidebar } from '../components/sidebar.js';
import { isTopicUnlocked } from '../adaptiveLogic.js';
import { checkAndAwardBadges } from '../badgeLogic.js';
import { awardXpAndCheckLevelUp, showBadgeToasts } from '../components/toast.js';

const LETTERS = ['A', 'B', 'C', 'D'];

let state = {
  questions: [],
  currentIndex: 0,
  answers: [],
  passScore: 80,
  topicId: null,
  tier: null,
  tierLabel: null,
  topicTitle: null,
};

export function cleanup() {
  state = {
    questions: [],
    currentIndex: 0,
    answers: [],
    passScore: 80,
    topicId: null,
    tier: null,
    tierLabel: null,
    topicTitle: null,
  };
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

function calculateScore() {
  const correct = state.answers.filter(a => a.isCorrect).length;
  return Math.round((correct / state.questions.length) * 100);
}

function renderProgressDots() {
  return state.questions.map((q, i) => {
    let cls = 'quiz-dot';
    if (i === state.currentIndex) cls += ' current';
    const ans = state.answers.find(a => a.questionId === q.id);
    if (ans) {
      cls += ans.isCorrect ? ' answered-correct' : ' answered-wrong';
    }
    return `<span class="${cls}"></span>`;
  }).join('');
}

async function handleSubmit(container) {
  const question = state.questions[state.currentIndex];
  const submitBtn = container.querySelector('.quiz-submit-btn');
  const nextBtn = container.querySelector('.quiz-next-btn');

  let userAnswer = null;
  let isCorrect = false;

  if (question.type === 'mcq') {
    const selected = container.querySelector('.quiz-option.selected');
    if (!selected) return;
    userAnswer = parseInt(selected.dataset.index, 10);
    isCorrect = userAnswer === question.correct;
  } else if (question.type === 'fill') {
    const input = container.querySelector('.quiz-fill-input');
    if (!input) return;
    userAnswer = input.value.trim();
    const caseSensitive = question.case_sensitive === true;
    isCorrect = caseSensitive
      ? userAnswer === question.answer
      : userAnswer.toLowerCase() === question.answer.toLowerCase();
  }

  state.answers.push({
    questionId: question.id,
    isCorrect,
    userAnswer,
  });

  const card = container.querySelector('.quiz-question-card');
  card.classList.add('answered');

  if (question.type === 'mcq') {
    container.querySelectorAll('.quiz-option').forEach(el => {
      const idx = parseInt(el.dataset.index, 10);
      if (idx === question.correct) {
        el.classList.add('correct-reveal');
      } else if (idx === userAnswer && !isCorrect) {
        el.classList.add('wrong-reveal');
      }
    });
  } else if (question.type === 'fill') {
    const input = container.querySelector('.quiz-fill-input');
    input.disabled = true;
    if (isCorrect) {
      input.classList.add('correct-reveal');
    } else {
      input.classList.add('wrong-reveal');
    }
  }

  submitBtn.style.display = 'none';

  if (question.explanation) {
    const expDiv = document.createElement('div');
    expDiv.className = `quiz-explanation ${isCorrect ? 'correct' : 'wrong'}`;
    expDiv.innerHTML = `<span>${isCorrect ? '✓' : '✗'}</span><span>${question.explanation}</span>`;
    card.appendChild(expDiv);
  }

  const isLast = state.currentIndex === state.questions.length - 1;
  nextBtn.style.display = '';
  nextBtn.textContent = isLast ? 'See Results →' : 'Next Question →';

  updateProgressDots();
}

function handleNext(container) {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    renderQuestion(container);
  } else {
    renderResults(container);
  }
}

async function handleContinue() {
  const score = calculateScore();
  const currentUser = store.currentUser;
  if (!currentUser) return;

  const progressRes = await window.electronAPI.getProgress(currentUser.id);
  const topicProgress = progressRes.success
    ? progressRes.data.find(p => p.topic_id === state.topicId)
    : null;
  const lessonDone = topicProgress ? topicProgress.lesson_done : 0;
  const challengePassed = topicProgress ? topicProgress.challenge_passed : 0;
  const newStatus = (lessonDone && score >= state.passScore && challengePassed) ? 'completed' : 'in_progress';

  await window.electronAPI.updateProgress(currentUser.id, state.topicId, {
    tier: state.tier,
    quiz_score: score,
    status: newStatus,
  });

  if (score >= state.passScore) {
    await awardXpAndCheckLevelUp(currentUser.id, 20, 'Quiz passed!');
  }

  await refreshSidebar();

  // Badge check
  const newBadges = await checkAndAwardBadges(currentUser.id, {});
  if (newBadges.length > 0) {
    showBadgeToasts(newBadges);
  }

  setTimeout(() => {
    navigate(`#challenge?topic=${state.topicId}`);
  }, 1200);
}

function renderResults(container) {
  const score = calculateScore();
  const passed = score >= state.passScore;

  // Increment attempts in DB on each full quiz completion
  const currentUser = store.currentUser;
  if (currentUser) {
    window.electronAPI.incrementAttempts(currentUser.id, state.topicId).catch(() => {});
  }

  container.innerHTML = `
    <div class="quiz-results">
      <div class="quiz-results-icon">${passed ? '🎉' : '📚'}</div>
      <div class="quiz-results-score ${passed ? 'pass' : 'fail'}">${score}%</div>
      <div class="quiz-results-message">
        ${passed ? 'Great job! You passed.' : 'Almost there! Review the lesson and try again.'}
      </div>
      <div class="quiz-results-actions">
        ${passed
          ? '<button class="quiz-continue-btn" id="js-quiz-continue">Continue →</button>'
          : '<button class="quiz-retry-btn" id="js-quiz-retry">Retry Quiz</button><button class="quiz-continue-btn" id="js-quiz-review">Review Lesson</button>'
        }
      </div>
    </div>
  `;

  const continueBtn = document.getElementById('js-quiz-continue');
  if (continueBtn) {
    continueBtn.addEventListener('click', handleContinue);
  }

  const retryBtn = document.getElementById('js-quiz-retry');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      state.currentIndex = 0;
      state.answers = [];
      renderQuestion(container);
    });
  }

  const reviewBtn = document.getElementById('js-quiz-review');
  if (reviewBtn) {
    reviewBtn.addEventListener('click', () => {
      navigate(`#learn?topic=${state.topicId}`);
    });
  }
}

function updateProgressDots() {
  const dots = document.querySelector('.quiz-progress-dots');
  if (dots) {
    dots.innerHTML = renderProgressDots();
  }
}

function renderQuestion(container) {
  const question = state.questions[state.currentIndex];
  const isLast = state.currentIndex === state.questions.length - 1;
  const existingAnswer = state.answers.find(a => a.questionId === question.id);
  const alreadyAnswered = !!existingAnswer;

  let questionHtml = '';

  if (question.type === 'mcq') {
    const optionsHtml = question.options.map((opt, i) => {
      let cls = 'quiz-option';
      if (alreadyAnswered) {
        if (i === question.correct) cls += ' correct-reveal';
        if (i === existingAnswer.userAnswer && !existingAnswer.isCorrect) cls += ' wrong-reveal';
        if (i !== question.correct && i !== existingAnswer.userAnswer) cls += '';
      }
      return `<div class="${cls}" data-index="${i}">
        <span class="quiz-option-letter">${LETTERS[i]}</span>
        <span>${opt}</span>
      </div>`;
    }).join('');

    questionHtml = `
      <div class="quiz-question-card ${alreadyAnswered ? 'answered' : ''}">
        <div class="quiz-question-text">${question.question}</div>
        <div class="quiz-options">${optionsHtml}</div>
        ${alreadyAnswered && question.explanation
          ? `<div class="quiz-explanation ${existingAnswer.isCorrect ? 'correct' : 'wrong'}">
               <span>${existingAnswer.isCorrect ? '✓' : '✗'}</span>
               <span>${question.explanation}</span>
             </div>`
          : ''}
      </div>
      <div class="quiz-footer">
        <button class="quiz-submit-btn" id="js-quiz-submit" ${alreadyAnswered ? 'style="display:none"' : 'disabled'}>Submit Answer</button>
        <button class="quiz-next-btn" id="js-quiz-next" style="${alreadyAnswered ? '' : 'display:none'}">
          ${isLast ? 'See Results →' : 'Next Question →'}
        </button>
      </div>
    `;
  } else if (question.type === 'fill') {
    let inputClass = 'quiz-fill-input';
    if (alreadyAnswered) {
      inputClass += existingAnswer.isCorrect ? ' correct-reveal' : ' wrong-reveal';
    }

    questionHtml = `
      <div class="quiz-question-card ${alreadyAnswered ? 'answered' : ''}">
        <div class="quiz-question-text">${question.question}</div>
        <div class="quiz-fill-input-wrapper">
          <input type="text" class="${inputClass}" placeholder="Type your answer..." ${alreadyAnswered ? 'disabled' : ''} value="${alreadyAnswered ? existingAnswer.userAnswer : ''}">
        </div>
        ${alreadyAnswered && question.explanation
          ? `<div class="quiz-explanation ${existingAnswer.isCorrect ? 'correct' : 'wrong'}">
               <span>${existingAnswer.isCorrect ? '✓' : '✗'}</span>
               <span>${question.explanation}</span>
             </div>`
          : ''}
      </div>
      <div class="quiz-footer">
        <button class="quiz-submit-btn" id="js-quiz-submit" ${alreadyAnswered ? 'style="display:none"' : 'disabled'}>Submit Answer</button>
        <button class="quiz-next-btn" id="js-quiz-next" style="${alreadyAnswered ? '' : 'display:none'}">
          ${isLast ? 'See Results →' : 'Next Question →'}
        </button>
      </div>
    `;
  }

  const dotsHtml = `<div class="quiz-progress-dots">${renderProgressDots()}</div>`;

  container.innerHTML = dotsHtml + questionHtml;

  attachEvents(container, question);
  if (alreadyAnswered) {
    const submitBtn = container.querySelector('.quiz-submit-btn');
    const nextBtn = container.querySelector('.quiz-next-btn');
    if (submitBtn) submitBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = '';
  }
}

function attachEvents(container, question) {
  if (question.type === 'mcq') {
    container.querySelectorAll('.quiz-option:not(.correct-reveal):not(.wrong-reveal)').forEach(el => {
      el.addEventListener('click', () => {
        if (container.querySelector('.quiz-question-card.answered')) return;
        container.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        const submitBtn = document.getElementById('js-quiz-submit');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  } else if (question.type === 'fill') {
    const input = container.querySelector('.quiz-fill-input');
    if (input && !input.disabled) {
      input.addEventListener('input', () => {
        const submitBtn = document.getElementById('js-quiz-submit');
        if (submitBtn) submitBtn.disabled = !input.value.trim();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          const submitBtn = document.getElementById('js-quiz-submit');
          if (submitBtn && !submitBtn.disabled) handleSubmit(container);
        }
      });
    }
  }

  const submitBtn = container.querySelector('.quiz-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => handleSubmit(container));
  }

  const nextBtn = container.querySelector('.quiz-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => handleNext(container));
  }
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
    page.innerHTML = '<div class="quiz-error">No topic specified.</div>';
    return;
  }

  removeRouteCleanup(cleanup);
  onRouteCleanup(cleanup);

  page.innerHTML = '<div class="quiz-loading">Loading quiz...</div>';

  let quiz, indexData;
  try {
    const [quizRes, indexRes] = await Promise.all([
      window.electronAPI.getQuiz(topicId),
      window.electronAPI.getTopicIndex(),
    ]);
    if (!quizRes.success) {
      page.innerHTML = `<div class="quiz-error">Failed to load quiz: ${quizRes.error}</div>`;
      return;
    }
    quiz = quizRes.data;
    indexData = indexRes.success ? indexRes.data : null;
  } catch (e) {
    page.innerHTML = `<div class="quiz-error">Failed to load quiz: ${e.message}</div>`;
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
      page.innerHTML = '<div class="quiz-error" style="text-align:center;padding:80px 20px"><div style="font-size:48px;margin-bottom:16px">🔒</div><div style="font-size:24px;color:var(--text-primary);font-family:var(--font-heading);font-weight:700;margin-bottom:8px">Topic Locked</div><div style="font-size:14px;color:var(--text-secondary)">Complete the prerequisite topics first</div></div>';
      setTimeout(() => navigate('#dashboard'), 2500);
      return;
    }
  }

  renderTopbar('Quick Check', ['Python', tierLabel, `${topicTitle} Quiz`]);

  state.questions = quiz.questions || [];
  state.currentIndex = 0;
  state.answers = [];
  state.passScore = quiz.pass_score || 80;
  state.topicId = topicId;
  state.tier = tier;
  state.tierLabel = tierLabel;
  state.topicTitle = topicTitle;

  const container = document.createElement('div');
  container.className = 'quiz-page';
  container.innerHTML = `
    <div class="quiz-header">
      <div class="quiz-title">Quick Check</div>
      <div class="quiz-subtitle">${topicTitle}</div>
    </div>
  `;

  page.innerHTML = '';
  page.appendChild(container);

  renderQuestion(container);
}
