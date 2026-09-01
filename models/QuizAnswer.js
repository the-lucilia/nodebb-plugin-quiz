// We are storing answers in QuizAttempt so this is Optional.
// If we want to a separate collection for analytics we can:
// static async bulkCreate(attemptId, answers) -> Stores answers from attempt
// static async getByAttempt(attemptId) -> retrieve all answers for an attempt
// static async getAnswerStats(qid) -> Get analytics (% of students choosing each answer, etc.)