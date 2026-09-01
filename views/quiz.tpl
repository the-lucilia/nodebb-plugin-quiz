<div class="quiz-container">
  <h2>Quiz Results</h2>
  <div class="quiz-results">
    <p><strong>Score:</strong> {score}/{totalQuestions} ({percentage}%)</p>
    <p><strong>Status:</strong> {passed ? 'PASSED' : 'FAILED'}</p>
    {#if questionDetails}
      <h3>Review</h3>
      {#each questionDetails as question}
        <div style="margin: 15px 0; padding: 10px; background: #f9f9f9; border-radius: 4px;">
          <strong>{question.questionText}</strong>
          <p>Your answer: {question.userAnswer}</p>
          <p>Correct: {question.correctAnswer}</p>
        </div>
      {/each}
    {/if}
  </div>
</div>
