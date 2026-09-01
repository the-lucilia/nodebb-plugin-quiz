'use strict';

const db = require.main.require('./src/database');
const Quiz = require('./Quiz');

class QuizAttempt {
    /**
     * Start a new quiz attempt
     */
    static async create(uid, qid) {
        // Verify user can take quiz
        const canTake = await Quiz.canTake(uid, qid);
        if (!canTake) {
            throw new Error('User cannot take this quiz');
        }

        const quiz = await Quiz.getById(qid);
        if (!quiz) throw new Error('Quiz not found');
        if (quiz.status !== 'active') throw new Error('Quiz is not active');

        // Check retake limits
        if (!quiz.settings.allowRetake) {
            const attempts = await this.getByStudent(uid, qid);
            if (attempts.length >= 1) {
                throw new Error('Retakes not allowed');
            }
        } else if (quiz.settings.maxAttempts) {
            const attempts = await this.getByStudent(uid, qid);
            if (attempts.length >= quiz.settings.maxAttempts) {
                throw new Error('Maximum attempts exceeded');
            }
        }

        const attemptId = await db.incr('quiz:attempt:uid');

        // Select random questions
        const selectedQuestions = await Quiz.selectRandomQuestions(
            qid,
            quiz.settings.numQuestions
        );

        const attempt = {
            attemptId,
            qid,
            studentId: uid,
            startedAt: Date.now(),
            completedAt: null,
            status: 'in-progress',
            selectedQuestions: selectedQuestions.map(q => q.questionId),
            answers: [],
            score: 0,
            percentage: 0,
            passed: false
        };

        await db.setObject(`quiz:attempt:${attemptId}`, attempt);
        await db.listPush(`quiz:${qid}:attempts:${uid}`, attemptId);
        await db.sortedSetAdd('quiz:attempts:all', Date.now(), attemptId);

        return {
            ...attempt,
            questions: selectedQuestions.map(q => ({
                questionId: q.questionId,
                questionText: q.questionText,
                answers: quiz.settings.randomizeAnswers
                    ? Quiz.randomizeAnswers(q).answers
                    : q.answers
            }))
        };
    }

    /**
     * Submit an answer to a question
     */
    static async submitAnswer(attemptId, questionId, answerId) {
        const attempt = await db.getObject(`quiz:attempt:${attemptId}`);
        if (!attempt) throw new Error('Attempt not found');
        if (attempt.status !== 'in-progress') throw new Error('Attempt already submitted');

        // Verify question is in this attempt
        if (!attempt.selectedQuestions.includes(Number(questionId))) {
            throw new Error('Question not in this attempt');
        }

        // Get question
        const question = await Quiz.getQuestion(attempt.qid, questionId);
        if (!question) throw new Error('Question not found');

        // Find answer
        const selectedAnswer = question.answers.find(a => Number(a.answerId) === Number(answerId));
        if (!selectedAnswer) throw new Error('Invalid answer');

        // Store answer record
        const answerRecord = {
            questionId: Number(questionId),
            selectedAnswerId: Number(answerId),
            isCorrect: selectedAnswer.isCorrect,
            points: selectedAnswer.isCorrect ? 1 : 0
        };

        // Check if already answered
        const existingIndex = attempt.answers.findIndex(a => a.questionId === Number(questionId));
        if (existingIndex !== -1) {
            attempt.answers[existingIndex] = answerRecord;
        } else {
            attempt.answers.push(answerRecord);
        }

        await db.setObject(`quiz:attempt:${attemptId}`, attempt);

        // Return success without revealing correctness
        return { success: true };
    }

    /**
     * Submit and grade the entire attempt
     */
    static async submitAttempt(attemptId) {
        const attempt = await db.getObject(`quiz:attempt:${attemptId}`);
        if (!attempt) throw new Error('Attempt not found');
        if (attempt.status !== 'in-progress') throw new Error('Attempt already submitted');

        const quiz = await Quiz.getById(attempt.qid);
        if (!quiz) throw new Error('Quiz not found');

        // Calculate score
        const correctCount = attempt.answers.filter(a => a.isCorrect).length;
        const totalQuestions = attempt.selectedQuestions.length;
        const percentage = totalQuestions > 0
            ? Math.round((correctCount / totalQuestions) * 100)
            : 0;

        const passingScore = quiz.settings.passingScore || 70;
        const passed = percentage >= passingScore;

        // Update attempt
        attempt.completedAt = Date.now();
        attempt.status = 'graded';
        attempt.score = correctCount;
        attempt.percentage = percentage;
        attempt.passed = passed;

        await db.setObject(`quiz:attempt:${attemptId}`, attempt);

        return {
            score: attempt.score,
            percentage: attempt.percentage,
            passed: attempt.passed,
            totalQuestions,
            passingScore
        };
    }

    /**
     * Get all attempts by a student for a quiz
     */
    static async getByStudent(uid, qid) {
        const key = `quiz:${qid}:attempts:${uid}`;
        const attemptIds = await db.listRange(key, 0, -1);
        const attempts = await Promise.all(
            attemptIds.map(id => db.getObject(`quiz:attempt:${id}`))
        );
        return attempts.filter(a => a !== null);
    }

    /**
     * Get single attempt with full details
     */
    static async getAttempt(attemptId, uid) {
        const attempt = await db.getObject(`quiz:attempt:${attemptId}`);
        if (!attempt) return null;

        const quiz = await Quiz.getById(attempt.qid);

        // Only student or faculty can view
        if (uid !== attempt.studentId && uid !== quiz.createdBy) {
            return null;
        }

        // Load full question data
        const questions = await Promise.all(
            attempt.selectedQuestions.map(qId => Quiz.getQuestion(attempt.qid, qId))
        );

        // Enrich with answers user selected
        attempt.questionDetails = questions.map(q => {
            const userAnswer = attempt.answers.find(a => a.questionId === q.questionId);
            return {
                questionId: q.questionId,
                questionText: q.questionText,
                answers: q.answers,
                explanation: q.explanation,
                userSelectedAnswerId: userAnswer?.selectedAnswerId || null,
                userSelectedCorrectly: userAnswer?.isCorrect || false
            };
        });

        return attempt;
    }

    /**
     * Get all attempts for a quiz (faculty view)
     */
    static async getQuizAttempts(qid, uid) {
        const quiz = await Quiz.getById(qid);
        if (!quiz) throw new Error('Quiz not found');

        // Only faculty can see all attempts
        if (uid !== quiz.createdBy) {
            throw new Error('Not authorized');
        }

        const attemptIds = await db.sortedSetRevRange('quiz:attempts:all', 0, -1);
        const attempts = [];

        for (const attemptId of attemptIds) {
            const attempt = await db.getObject(`quiz:attempt:${attemptId}`);
            if (attempt && attempt.qid === qid) {
                attempts.push(attempt);
            }
        }

        return attempts;
    }

    /**
     * Get all attempts for a student in a quiz (faculty view)
     */
    static async getStudentAttempts(qid, studentId, uid) {
        const quiz = await Quiz.getById(qid);
        if (!quiz) throw new Error('Quiz not found');

        // Only faculty can see others' attempts
        if (uid !== quiz.createdBy) {
            throw new Error('Not authorized');
        }

        return await this.getByStudent(studentId, qid);
    }

    /**
     * Delete attempt
     */
    static async delete(attemptId, uid) {
        const attempt = await db.getObject(`quiz:attempt:${attemptId}`);
        if (!attempt) throw new Error('Attempt not found');

        const quiz = await Quiz.getById(attempt.qid);
        if (uid !== quiz.createdBy) {
            throw new Error('Not authorized');
        }

        // Remove from student's list
        const key = `quiz:${attempt.qid}:attempts:${attempt.studentId}`;
        const attemptIds = await db.listRange(key, 0, -1);
        const index = attemptIds.indexOf(String(attemptId));
        if (index !== -1) {
            await db.listRemoveIndex(key, index);
        }

        await db.delete(`quiz:attempt:${attemptId}`);
    }
}

module.exports = QuizAttempt;
