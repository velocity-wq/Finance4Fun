// ============================================
// FINANCE4FUN — Quiz Engine
// Hardened: safe DOM rendering, edge case handling
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // --- Elements ---
  const paywallOverlay = document.getElementById('paywall-overlay');
  const previewBtn = document.getElementById('preview-btn');
  const joinBtn = document.getElementById('join-btn');
  const quizSetup = document.getElementById('quiz-setup');
  const quizArea = document.getElementById('quiz-area');
  const quizResults = document.getElementById('quiz-results');
  const quizCategorySelect = document.getElementById('quiz-category');
  const quizLevelSelect = document.getElementById('quiz-level');
  const quizCountSelect = document.getElementById('quiz-count');
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

  // --- Safety check: make sure all elements exist ---
  if (!quizSetup || !quizArea || !quizOptions) {
    console.error('Quiz: Required page elements not found.');
    return;
  }

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

  // --- Paywall ---
  previewBtn.addEventListener('click', () => {
    paywallOverlay.style.display = 'none';
  });

  joinBtn.addEventListener('click', () => {
    alert('Membership coming soon! For now, enjoy a free preview.');
    paywallOverlay.style.display = 'none';
  });

  // --- Generate quiz questions ---
  function generateQuestions() {
    const category = quizCategorySelect.value;
    const level = quizLevelSelect.value;
    const count = parseInt(quizCountSelect.value, 10);

    // Filter available terms
    let available = FINANCE_TERMS.filter(term => {
      const catMatch = category === 'all' || term.category === category;
      const lvlMatch = level === 'all' || term.level === level;
      return catMatch && lvlMatch;
    });

    // Need at least 2 terms to make a quiz (1 correct + at least 1 wrong)
    if (available.length < 2) {
      return false;
    }

    // Shuffle
    available = shuffleArray([...available]);

    // Take up to count
    const selected = available.slice(0, count);

    // Generate questions
    questions = selected.map(term => {
      // Get wrong answers from OTHER terms (never the same as the correct one)
      const otherTerms = FINANCE_TERMS.filter(t => t.id !== term.id);
      // Take up to 3 wrong answers (handle case where there are fewer than 3 other terms)
      const numWrong = Math.min(3, otherTerms.length);
      const wrongAnswers = shuffleArray([...otherTerms]).slice(0, numWrong);

      // Build options — truncate ONCE here
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
      alert('Not enough terms in that category/level to make a quiz. Try "All Categories" or "All Levels"!');
      return;
    }
    currentQuestion = 0;
    score = 0;
    quizSetup.style.display = 'none';
    quizResults.style.display = 'none';
    quizArea.style.display = 'block';
    renderQuestion();
  });

  // --- Render current question (safe DOM construction — no innerHTML with user data) ---
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

    // Clear previous options
    quizOptions.innerHTML = '';

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';

      // Build option safely using DOM methods (no innerHTML)
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

  // --- Handle answer selection ---
  function handleAnswer(selectedBtn, isCorrect, selectedIndex) {
    if (answered) return;
    answered = true;

    const allBtns = quizOptions.querySelectorAll('.quiz-option');

    // Disable all buttons
    allBtns.forEach(btn => btn.classList.add('disabled'));

    // Mark correct/incorrect
    if (isCorrect) {
      selectedBtn.classList.add('correct');
      score++;
      quizScoreEl.textContent = `Score: ${score}`;
    } else {
      selectedBtn.classList.add('incorrect');
      // Show the correct one
      const q = questions[currentQuestion];
      q.options.forEach((opt, i) => {
        if (opt.correct && allBtns[i]) {
          allBtns[i].classList.add('correct');
        }
      });
    }

    // Show next button
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
  }

  // --- Retry ---
  retryQuizBtn.addEventListener('click', () => {
    quizResults.style.display = 'none';
    quizSetup.style.display = 'block';
  });
});
