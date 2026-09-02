// Quiz Admin Dashboard Manager
'use strict';

const QuizAdmin = {
    currentQuizId: null,
    currentAttempts: [],

    /**
     * Initialize admin dashboard
     */
    init() {
        this.attachEventListeners();
        this.loadQuestionCounts();
    },

    /**
     * Attach event listeners to dashboard buttons
     */
    attachEventListeners() {
        const self = this;

        // View Results button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quiz-view-results')) {
                const qid = e.target.dataset.quizId;
                self.showResultsModal(qid);
            }
        });

        // Delete Quiz button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quiz-delete')) {
                const qid = e.target.dataset.quizId;
                if (confirm('Are you sure you want to delete this quiz?')) {
                    self.deleteQuiz(qid);
                }
            }
        });

        // Publish Quiz button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quiz-publish')) {
                const qid = e.target.dataset.quizId;
                self.publishQuiz(qid);
            }
        });

        // View attempt details
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-attempt-btn')) {
                const attemptId = e.target.dataset.attemptId;
                self.showAttemptDetailsModal(attemptId);
            }
        });

        // Delete attempt
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-attempt-btn')) {
                const attemptId = e.target.dataset.attemptId;
                if (confirm('Delete this attempt?')) {
                    self.deleteAttempt(attemptId);
                }
            }
        });

        // Export CSV
        document.addEventListener('click', (e) => {
            if (e.target.id === 'export-csv-btn') {
                self.exportCSV(self.currentQuizId);
            }
        });

        // Close modals
        const closeResultsBtn = document.getElementById('close-results-modal');
        if (closeResultsBtn) {
            closeResultsBtn.addEventListener('click', () => self.closeResultsModal());
        }

        const closeDetailsBtn = document.getElementById('close-details-modal');
        if (closeDetailsBtn) {
            closeDetailsBtn.addEventListener('click', () => self.closeDetailsModal());
        }

        // Close modal when clicking outside
        const resultsModal = document.getElementById('quiz-results-modal');
        if (resultsModal) {
            resultsModal.addEventListener('click', (e) => {
                if (e.target.id === 'quiz-results-modal') {
                    self.closeResultsModal();
                }
            });
        }

        const detailsModal = document.getElementById('attempt-details-modal');
        if (detailsModal) {
            detailsModal.addEventListener('click', (e) => {
                if (e.target.id === 'attempt-details-modal') {
                    self.closeDetailsModal();
                }
            });
        }
    },

    /**
     * Load question counts for all quizzes
     */
    async loadQuestionCounts() {
        const spans = document.querySelectorAll('[data-field="questionCount"]');
        for (const span of spans) {
            const qid = span.dataset.quizId;
            try {
                const response = await fetch(`/api/quiz/${qid}`);
                const quiz = await response.json();
                if (response.ok) {
                    span.textContent = quiz.questionPoolSize || 0;
                }
            } catch (err) {
                console.error('Error loading question count:', err);
                span.textContent = 'N/A';
            }
        }
    },

    /**
     * Show results modal with all student attempts
     */
    async showResultsModal(qid) {
        this.currentQuizId = qid;
        const modal = document.getElementById('quiz-results-modal');
        const content = document.getElementById('results-modal-content');

        if (!modal || !content) return;

        content.innerHTML = '<p style="text-align: center; color: #666;">Loading attempts...</p>';
        modal.style.display = 'flex';

        try {
            const attempts = await this.loadAttempts(qid);
            this.currentAttempts = attempts;
            this.renderResultsTable(attempts);
        } catch (err) {
            content.innerHTML = `<div style="color: #dc3545; padding: 20px;">Error loading attempts: ${err.message}</div>`;
        }
    },

    /**
     * Load attempts for a quiz via API
     */
    async loadAttempts(qid) {
        const response = await fetch(`/api/quiz/${qid}/attempts`);
        if (!response.ok) {
            throw new Error('Failed to load attempts');
        }
        return await response.json();
    },

    /**
     * Render results table in modal
     */
    renderResultsTable(attempts) {
        const content = document.getElementById('results-modal-content');

        if (!content) return;

        if (attempts.length === 0) {
            content.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No student attempts yet.</p>';
            return;
        }

        let html = `
            <div style="margin-bottom: 15px;">
                <button id="export-csv-btn" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    📥 Export as CSV
                </button>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                <thead style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                    <tr>
                        <th style="padding: 10px; text-align: left;">Student</th>
                        <th style="padding: 10px; text-align: center;">Score</th>
                        <th style="padding: 10px; text-align: center;">%</th>
                        <th style="padding: 10px; text-align: center;">Status</th>
                        <th style="padding: 10px; text-align: left;">Submitted</th>
                        <th style="padding: 10px; text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        attempts.forEach(attempt => {
            const date = new Date(attempt.completedAt || attempt.startedAt);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            const isPassed = attempt.passed;
            const statusClass = isPassed ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;';
            const statusText = isPassed ? 'PASSED' : 'FAILED';
            const score = attempt.score || 0;
            const total = attempt.selectedQuestions?.length || 0;
            const percentage = attempt.percentage || 0;

            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${this.escapeHtml(attempt.studentName || 'Unknown')}</td>
                    <td style="padding: 10px; text-align: center;"><strong>${score}/${total}</strong></td>
                    <td style="padding: 10px; text-align: center;"><strong>${percentage}%</strong></td>
                    <td style="padding: 10px; text-align: center;">
                        <span style="padding: 4px 8px; border-radius: 3px; font-size: 0.85em; font-weight: bold; ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td style="padding: 10px; font-size: 0.85em; color: #666;">${dateStr}</td>
                    <td style="padding: 10px; text-align: center;">
                        <button class="view-attempt-btn" data-attempt-id="${attempt.attemptId}" 
                            style="padding: 4px 8px; background: #17a2b8; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8em; margin-right: 5px;">
                            View
                        </button>
                        <button class="delete-attempt-btn" data-attempt-id="${attempt.attemptId}" 
                            style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8em;">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        content.innerHTML = html;
    },

    /**
     * Show attempt details modal
     */
    async showAttemptDetailsModal(attemptId) {
        const modal = document.getElementById('attempt-details-modal');
        const content = document.getElementById('details-modal-content');

        if (!modal || !content) return;

        content.innerHTML = '<p style="text-align: center; color: #666;">Loading attempt details...</p>';
        modal.style.display = 'flex';

        try {
            const response = await fetch(`/api/quiz/attempt/${attemptId}`);
            if (!response.ok) {
                throw new Error('Failed to load attempt');
            }
            const attempt = await response.json();
            this.renderAttemptDetails(attempt);
        } catch (err) {
            content.innerHTML = `<div style="color: #dc3545; padding: 20px;">Error: ${err.message}</div>`;
        }
    },

    /**
     * Render attempt details in modal
     */
    renderAttemptDetails(attempt) {
        const content = document.getElementById('details-modal-content');
        if (!content) return;

        const date = new Date(attempt.completedAt || attempt.startedAt);
        const isPassed = attempt.passed;
        const statusClass = isPassed ? 'color: #28a745;' : 'color: #dc3545;';
        const statusText = isPassed ? 'PASSED' : 'FAILED';

        let html = `
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0;">Attempt Summary</h3>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 4px;">
                    <p><strong>Score:</strong> ${attempt.score}/${attempt.selectedQuestions?.length || 0} (${attempt.percentage}%)</p>
                    <p><strong>Status:</strong> <span style="${statusClass}; font-weight: bold;">${statusText}</span></p>
                    <p><strong>Submitted:</strong> ${date.toLocaleString()}</p>
                </div>
            </div>

            <div>
                <h3 style="margin: 0 0 15px 0;">Question Review</h3>
        `;

        if (attempt.questionDetails && attempt.questionDetails.length > 0) {
            attempt.questionDetails.forEach((q, index) => {
                const correct = q.answers.find(a => a.isCorrect);
                const userSelected = q.answers.find(a => a.answerId === q.userSelectedAnswerId);
                const isCorrect = q.userSelectedCorrectly;
                const answerClass = isCorrect ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;';

                html += `
                    <div style="margin-bottom: 15px; padding: 12px; background: #f9f9f9; border-left: 4px solid ${isCorrect ? '#28a745' : '#dc3545'}; border-radius: 3px;">
                        <p style="margin: 0 0 8px 0;"><strong>Q${index + 1}:</strong> ${this.escapeHtml(q.questionText)}</p>
                        <p style="margin: 5px 0;"><strong>User Answer:</strong> ${userSelected ? this.escapeHtml(userSelected.text) : '<em>Not answered</em>'}</p>
                        <p style="margin: 5px 0;"><strong>Correct Answer:</strong> ${this.escapeHtml(correct.text)}</p>
                        <p style="margin: 5px 0; padding: 5px; border-radius: 3px; ${answerClass}">
                            ${isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </p>
                        ${q.explanation ? `
                            <div style="margin-top: 8px; padding: 8px; background: #fff9e6; border-left: 3px solid #ffc107; border-radius: 3px;">
                                <strong>Explanation:</strong> ${this.escapeHtml(q.explanation)}
                            </div>
                        ` : ''}
                    </div>
                `;
            });
        } else {
            html += '<p style="color: #999;">No question details available.</p>';
        }

        html += '</div>';
        content.innerHTML = html;
    },

    /**
     * Close results modal
     */
    closeResultsModal() {
        const modal = document.getElementById('quiz-results-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    /**
     * Close details modal
     */
    closeDetailsModal() {
        const modal = document.getElementById('attempt-details-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    /**
     * Delete a quiz
     */
    async deleteQuiz(qid) {
        try {
            const response = await fetch(`/api/quiz/${qid}`, { method: 'DELETE' });
            if (response.ok) {
                alert('Quiz deleted successfully');
                location.reload();
            } else {
                alert('Error deleting quiz');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    /**
     * Publish a quiz (change status from draft to active)
     */
    async publishQuiz(qid) {
        try {
            const response = await fetch(`/api/quiz/${qid}/publish`, { method: 'POST' });
            if (response.ok) {
                alert('Quiz published successfully');
                location.reload();
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Failed to publish quiz'));
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    /**
     * Delete an attempt
     */
    async deleteAttempt(attemptId) {
        try {
            const response = await fetch(`/api/quiz/attempt/${attemptId}`, { method: 'DELETE' });
            if (response.ok) {
                alert('Attempt deleted successfully');
                // Reload results modal
                if (this.currentQuizId) {
                    this.showResultsModal(this.currentQuizId);
                }
            } else {
                alert('Error deleting attempt');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    /**
     * Export results as CSV
     */
    async exportCSV(qid) {
        try {
            if (!this.currentAttempts || this.currentAttempts.length === 0) {
                alert('No attempts to export');
                return;
            }

            let csv = 'Student Name,Score,Percentage,Status,Submitted Date\n';

            this.currentAttempts.forEach(attempt => {
                const date = new Date(attempt.completedAt || attempt.startedAt);
                const score = attempt.score || 0;
                const total = attempt.selectedQuestions?.length || 0;
                const percentage = attempt.percentage || 0;
                const status = attempt.passed ? 'PASSED' : 'FAILED';
                const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                const studentName = (attempt.studentName || 'Unknown').replace(/"/g, '""');

                csv += `"${studentName}",${score}/${total},${percentage}%,${status},"${dateStr}"\n`;
            });

            // Create blob and download
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `quiz-${qid}-results-${new Date().getTime()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Error exporting CSV: ' + err.message);
        }
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    QuizAdmin.init();
});

