// ============================================
// FINANCE4FUN — Quiz Engine
// Free quiz system with membership gating
// ============================================

// --- Reset mechanism ---
// To re-enable the free quiz, add ?reset to the URL:
//   quiz.html?reset
// This works reliably in any browser, no console needed.
(function() {
  if (window.location.search.includes('reset')) {
    localStorage.removeItem('f4f_free_quiz_used');
    // Clean the URL so it doesn't keep resetting
    window.location.replace(window.location.pathname);
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  // --- Elements ---
  const paywallOverlay = document.getElementById('paywall-overlay');
  const previewBtn = document.getElementById('preview-btn');
  const joinBtn = document.getElementById('join-btn');
  const membershipOverlay = document.getElementById('membership-overlay');
  const membershipJoinBtn = document.getElementById('membership-join-btn');
  const membershipLearnBtn = document.getElementById('membership-learn-btn');
  const membershipGlossaryBtn = document.getElementById('membership-glossary-btn');
  const quizSetup = document.getElementById('quiz-setup');
  const quizSetupTitle = document.getElementById('quiz-setup-title');
  const quizArea = document.getElementById('quiz-area');
  const quizResults = document.getElementById('quiz-results');
  const quizCategorySelect = document.getElementById('quiz-category');
  const quizLevelSelect = document.getElementById('quiz-level');
  const quizCountSelect = document.getElementById('quiz-count');
  const quizLevelGroup = document.getElementById('quiz-level-group');
  const quizCountGroup = document.getElementById('quiz-count-group');
  const freeQuizBadge = document.getElementById('free-quiz-badge');
  const startQuizBtn = document.getElementById('start-quiz-btn');
  const quizProgress = document.getElementById('quiz-progress');
  const quizScoreEl = document.getElementById('quiz-score');
  const quizProgressFill = document.getElementById('quiz-progress-fill');
  const quizQNum = document.getElementById('quiz-q-num');
  const quizQuestionText = document.getElementById('quiz-question-text');
  const quizOptions = document.getElementById('quiz-options');
  const quizNextWrapper = document.getElementById('quiz-next-wrapper');
  const quizNextBtn = document.getElementById('quiz-next-btn');
  const retryQuizBtn = document.getElementById('retry-quiz-btn');
  const resultsIcon = document.getElementById('results-icon');
  const resultsScore = document.getElementById('results-score');
  const resultsMessage = document.getElementById('results-message');

  let questions = [];
  let currentQuestion = 0;
  let score = 0;
  let answered = false;
  let isFreeQuizMode = false;

  // --- Safety check ---
  if (!quizSetup || !quizArea || !quizOptions) {
    console.error('Quiz: Required page elements not found.');
    return;
  }

  // =============================================
  // FREE QUIZ TRACKING
  // Uses localStorage so it persists across sessions.
  // Reset anytime by running: resetFreeQuiz() in the browser console
  // =============================================
  const FREE_QUIZ_KEY = 'f4f_free_quiz_used';

  function hasFreeQuizBeenUsed() {
    return localStorage.getItem(FREE_QUIZ_KEY) === 'true';
  }

  function markFreeQuizUsed() {
    localStorage.setItem(FREE_QUIZ_KEY, 'true');
  }

  // Reset function is defined globally above the DOMContentLoaded block
  // so it is always accessible from the browser console.

  // --- Populate filter dropdowns ---
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${cat.emoji} ${cat.name}`;
    quizCategorySelect.appendChild(opt);
  });

  Object.entries(LEVELS).forEach(([key, lvl]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${lvl.emoji} ${lvl.name}`;
    quizLevelSelect.appendChild(opt);
  });

  // =============================================
  // PAGE LOAD LOGIC
  // =============================================
  function initQuizPage() {
    if (hasFreeQuizBeenUsed()) {
      // Free quiz already used — show the members-only overlay (can't be dismissed)
      paywallOverlay.style.display = 'none';
      quizSetup.style.display = 'none';
      quizArea.style.display = 'none';
      quizResults.style.display = 'none';
      membershipOverlay.style.display = 'flex';
    } else {
      // First visit — show the initial paywall with free quiz option
      paywallOverlay.style.display = 'flex';
      membershipOverlay.style.display = 'none';
    }
  }

  // --- Initial paywall: "Preview a free quiz" ---
  previewBtn.addEventListener('click', () => {
    paywallOverlay.style.display = 'none';
    enterFreeQuizMode();
  });

  joinBtn.addEventListener('click', () => {
    alert('Membership coming soon! For now, enjoy a free preview.');
    paywallOverlay.style.display = 'none';
    enterFreeQuizMode();
  });

  // --- Membership overlay actions (can't be dismissed — only navigate away) ---
  membershipJoinBtn.addEventListener('click', () => {
    alert('Membership coming soon! Check back for updates.');
  });

  membershipLearnBtn.addEventListener('click', () => {
    window.location.href = 'learn.html';
  });

  membershipGlossaryBtn.addEventListener('click', () => {
    window.location.href = 'glossary.html';
  });

  // =============================================
  // FREE QUIZ MODE
  // =============================================
  function enterFreeQuizMode() {
    isFreeQuizMode = true;

    // Lock difficulty to Beginner
    quizLevelSelect.value = 'beginner';
    quizLevelSelect.disabled = true;
    quizLevelGroup.classList.add('locked');

    // Lock count to 5
    quizCountSelect.value = '5';
    quizCountSelect.disabled = true;
    quizCountGroup.classList.add('locked');

    // Show the free quiz badge
    if (freeQuizBadge) freeQuizBadge.style.display = 'block';

    // Update the title
    if (quizSetupTitle) quizSetupTitle.textContent = 'Free Quiz Preview';

    // Show the setup form
    quizSetup.style.display = 'block';
  }

  // --- Generate quiz questions ---
  function generateQuestions() {
    const category = quizCategorySelect.value;
    const level = quizLevelSelect.value;
    const count = parseInt(quizCountSelect.value, 10);

    let available = FINANCE_TERMS.filter(term => {
      const catMatch = category === 'all' || term.category === category;
      const lvlMatch = level === 'all' || term.level === level;
      return catMatch && lvlMatch;
    });

    if (available.length < 2) return false;

    available = shuffleArray([...available]);
    const selected = available.slice(0, count);

    questions = selected.map(term => {
      const otherTerms = FINANCE_TERMS.filter(t => t.id !== term.id);
      const numWrong = Math.min(3, otherTerms.length);
      const wrongAnswers = shuffleArray([...otherTerms]).slice(0, numWrong);

      const options = shuffleArray([
        { text: truncateText(term.definition, 120), correct: true },
        ...wrongAnswers.map(t => ({ text: truncateText(t.definition, 120), correct: false }))
      ]);

      return {
        term: term.term,
        category: term.category,
        level: term.level,
        options: options
      };
    });

    return questions.length > 0;
  }

  function truncateText(text, maxLen) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen).trim() + '…';
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // --- Start Quiz ---
  startQuizBtn.addEventListener('click', () => {
    if (!generateQuestions()) {
      alert('Not enough terms in that category/level to make a quiz. Try "All Categories"!');
      return;
    }
    currentQuestion = 0;
    score = 0;
    quizSetup.style.display = 'none';
    quizResults.style.display = 'none';
    quizArea.style.display = 'block';
    renderQuestion();
  });

  // --- Render question ---
  function renderQuestion() {
    answered = false;
    const q = questions[currentQuestion];
    if (!q) return;

    const letters = ['A', 'B', 'C', 'D'];

    quizQNum.textContent = `Question ${currentQuestion + 1}`;
    quizProgress.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
    quizScoreEl.textContent = `Score: ${score}`;
    quizProgressFill.style.width = `${((currentQuestion) / questions.length) * 100}%`;
    quizQuestionText.textContent = `What is the definition of "${q.term}"?`;

    quizOptions.innerHTML = '';

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';

      const letterSpan = document.createElement('span');
      letterSpan.className = 'option-letter';
      letterSpan.textContent = letters[i] || '?';

      const textSpan = document.createElement('span');
      textSpan.textContent = opt.text;

      btn.appendChild(letterSpan);
      btn.appendChild(textSpan);
      btn.addEventListener('click', () => handleAnswer(btn, opt.correct, i));
      quizOptions.appendChild(btn);
    });

    quizNextWrapper.style.display = 'none';
  }

  // --- Handle answer ---
  function handleAnswer(selectedBtn, isCorrect, selectedIndex) {
    if (answered) return;
    answered = true;

    const allBtns = quizOptions.querySelectorAll('.quiz-option');
    allBtns.forEach(btn => btn.classList.add('disabled'));

    if (isCorrect) {
      selectedBtn.classList.add('correct');
      score++;
      quizScoreEl.textContent = `Score: ${score}`;
      // Award FinCoins for correct answer
      if (typeof F4FCoins !== 'undefined') F4FCoins.add(5);
    } else {
      selectedBtn.classList.add('incorrect');
      const q = questions[currentQuestion];
      q.options.forEach((opt, i) => {
        if (opt.correct && allBtns[i]) {
          allBtns[i].classList.add('correct');
        }
      });
    }

    quizNextWrapper.style.display = 'block';
    if (currentQuestion < questions.length - 1) {
      quizNextBtn.textContent = 'Next Question →';
    } else {
      quizNextBtn.textContent = 'See Results →';
    }
  }

  // --- Next question ---
  quizNextBtn.addEventListener('click', () => {
    if (currentQuestion < questions.length - 1) {
      currentQuestion++;
      renderQuestion();
    } else {
      showResults();
    }
  });

  // --- Show results ---
  function showResults() {
    quizArea.style.display = 'none';
    quizResults.style.display = 'block';

    const percentage = questions.length > 0
      ? Math.round((score / questions.length) * 100)
      : 0;

    resultsScore.textContent = `${score} / ${questions.length}`;

    if (percentage >= 90) {
      resultsIcon.textContent = '🏆';
      resultsMessage.textContent = 'Outstanding! You really know your finance terms!';
    } else if (percentage >= 70) {
      resultsIcon.textContent = '🌟';
      resultsMessage.textContent = 'Great job! You have a solid understanding.';
    } else if (percentage >= 50) {
      resultsIcon.textContent = '📘';
      resultsMessage.textContent = 'Good effort! Review the flashcards to strengthen your knowledge.';
    } else {
      resultsIcon.textContent = '💪';
      resultsMessage.textContent = "Keep going! Head to the flashcards to study, then try again.";
    }

    // Award FinCoins for completing a quiz
    if (typeof F4FCoins !== 'undefined') F4FCoins.add(10);

    // If this was a free quiz, mark it as used
    if (isFreeQuizMode) {
      markFreeQuizUsed();
    }
  }

  // --- Retry ---
  retryQuizBtn.addEventListener('click', () => {
    if (isFreeQuizMode) {
      // Free quiz is now used — show membership overlay
      quizResults.style.display = 'none';
      membershipOverlay.style.display = 'flex';
    } else {
      quizResults.style.display = 'none';
      quizSetup.style.display = 'block';
    }
  });

  // --- Initialize ---
  initQuizPage();
});
