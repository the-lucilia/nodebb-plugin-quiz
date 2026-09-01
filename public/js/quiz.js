(function() {
    'use strict';

    const QuizUI = {
        init() {
            document.querySelectorAll('.quiz-wrapper').forEach(el => {
                this.loadQuiz(el);
            });
        },

        async loadQuiz(container) {
            const qid = container.dataset.quizId;
            const response = await fetch(`/api/quiz/${qid}`);
            const quiz = await response.json();

            if (!response.ok) {
                container.innerHTML = `<div class="quiz-error">${quiz.error}</div>`;
                return;
            }

            container.innerHTML = `
        <div class="quiz-header">
          <div class="quiz-title">${escapeHtml(quiz.title)}</div>
          ${quiz.description ? `<div class="quiz-description">${escapeHtml(quiz.description)}</div>` : ''}
          <p style="color: #666; font-size: 0.9em;">${quiz.settings.numQuestions} questions from a pool of ${quiz.questionPoolSize}</p>
          ${!quiz.isCreator ? `<button class="quiz-start-button" data-quiz-id="${qid}">Start Quiz</button>` : '<p style="color: #999;">You are the instructor. Students will see this quiz.</p>'}
        </div>
      `;

            if (!quiz.isCreator) {
                container.querySelector('.quiz-start-button').addEventListener('click', () => this.startQuiz(qid, container));
            }
        },

        async startQuiz(qid, container) {
            const response = await fetch(`/api/quiz/${qid}/start`, { method: 'POST' });
            const data = await response.json();

            if (!response.ok) {
                container.innerHTML = `<div class="quiz-error">${data.error}</div>`;
                return;
            }

            this.renderQuiz(data, container);
        },

        renderQuiz(data, container) {
            const { attemptId, questions, settings } = data;
            let html = '';

            if (settings.timeLimit > 0) {
                html += `<div class="quiz-timer">Time remaining: <span id="timer-${attemptId}"></span></div>`;
            }

            html += '<div class="quiz-questions">';
            questions.forEach(q => {
                html += `
          <div class="quiz-question" data-question-id="${q.questionId}">
            <div class="quiz-question-text">${escapeHtml(q.questionText)}</div>
            <div class="quiz-answers">
              ${q.answers.map(a => `
                <label class="quiz-answer">
                  <input type="radio" name="question-${q.questionId}" value="${a.answerId}" data-answer-id="${a.answerId}">
                  ${escapeHtml(a.text)}
                </label>
              `).join('')}
            </div>
          </div>
        `;
            });

            html += `
        </div>
        <div class="quiz-actions">
          <button class="quiz-submit-button" data-attempt-id="${attemptId}">Submit Quiz</button>
        </div>
      `;

            container.innerHTML = html;

            // Add event listeners
            container.querySelectorAll('input[type="radio"]').forEach(input => {
                input.addEventListener('change', (e) => this.recordAnswer(attemptId, e));
            });

            container.querySelector('.quiz-submit-button').addEventListener('click', () => {
                this.submitQuiz(attemptId, container);
            });

            if (settings.timeLimit > 0) {
                this.startTimer(attemptId, settings.timeLimit, container);
            }
        },

        async recordAnswer(attemptId, event) {
            const questionId = event.target.closest('.quiz-question').dataset.questionId;
            const answerId = event.target.value;

            await fetch(`/api/quiz/attempt/${attemptId}/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId, answerId })
            });
        },

        async submitQuiz(attemptId, container) {
            const response = await fetch(`/api/quiz/attempt/${attemptId}/submit`, { method: 'POST' });
            const result = await response.json();

            if (!response.ok) {
                container.innerHTML = `<div class="quiz-error">${result.error}</div>`;
                return;
            }

            this.showResults(attemptId, result, container);
        },

        async showResults(attemptId, result, container) {
            const response = await fetch(`/api/quiz/attempt/${attemptId}`);
            const attempt = await response.json();

            const passStatus = result.passed ? 'quiz-passed' : 'quiz-failed';
            const passText = result.passed ? 'PASSED' : 'FAILED';

            let html = `
        <div class="quiz-results">
          <div class="quiz-score">${result.percentage}%</div>
          <div class="quiz-result-detail ${passStatus}">
            Score: ${result.score}/${result.totalQuestions} - ${passText}
          </div>
          <div class="quiz-result-detail">Passing Score: ${result.passingScore}%</div>
      `;

            if (attempt.questionDetails) {
                html += '<div style="margin-top: 20px;"><strong>Review:</strong>';
                attempt.questionDetails.forEach(q => {
                    const correct = q.answers.find(a => a.isCorrect);
                    const userSelected = q.answers.find(a => a.answerId === q.userSelectedAnswerId);
                    html += `
            <div style="margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 3px;">
              <strong>${escapeHtml(q.questionText)}</strong><br>
              Your answer: ${userSelected ? escapeHtml(userSelected.text) : 'Not answered'}<br>
              Correct answer: ${escapeHtml(correct.text)}<br>
              ${q.explanation ? `<div class="quiz-answer-explanation"><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</div>` : ''}
            </div>
          `;
                });
                html += '</div>';
            }

            html += '</div>';
            container.innerHTML = html;
        },

        startTimer(attemptId, seconds, container) {
            let remaining = seconds;
            const timerEl = container.querySelector(`#timer-${attemptId}`);

            const interval = setInterval(() => {
                const mins = Math.floor(remaining / 60);
                const secs = remaining % 60;
                timerEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;

                if (remaining <= 0) {
                    clearInterval(interval);
                    container.querySelector('.quiz-submit-button').click();
                }
                remaining--;
            }, 1000);
        }
    };

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    document.addEventListener('DOMContentLoaded', () => QuizUI.init());
})();
