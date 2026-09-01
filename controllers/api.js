'use strict';

const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const QuizQuestion = require('../models/QuizQuestion');
const user = require.main.require('./src/user');

/**
 * GET /api/quiz/:qid
 * Get quiz details (student view - no answers revealed)
 */
exports.getQuiz = async (req, res) => {
    try {
        const { qid } = req.params;
        const uid = req.user?.uid;

        const quiz = await Quiz.getById(qid);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const canView = await Quiz.canView(uid, qid);
        if (!canView) {
            return res.status(403).json({ error: 'Not authorized to view this quiz' });
        }

        // Include question count but not questions yet
        const questions = await Quiz.getQuestions(qid);

        return res.json({
            qid: quiz.qid,
            title: quiz.title,
            description: quiz.description,
            settings: quiz.settings,
            status: quiz.status,
            questionPoolSize: questions.length,
            isCreator: uid === quiz.createdBy
        });
    } catch (err) {
        console.error('Error getting quiz:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/quiz/:qid/start
 * Start a new quiz attempt
 */
exports.startQuiz = async (req, res) => {
    try {
        const { qid } = req.params;
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: 'Not logged in' });
        }

        const attempt = await QuizAttempt.create(uid, qid);

        return res.json({
            attemptId: attempt.attemptId,
            questions: attempt.questions,
            settings: {
                timeLimit: (await Quiz.getById(qid)).settings.timeLimit
            }
        });
    } catch (err) {
        console.error('Error starting quiz:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * POST /api/quiz/attempt/:attemptId/answer
 * Submit an answer to a question
 */
exports.submitAnswer = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { questionId, answerId } = req.body;
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: 'Not logged in' });
        }

        if (!questionId || answerId === undefined) {
            return res.status(400).json({ error: 'questionId and answerId required' });
        }

        // Verify ownership
        const attempt = await require.main.require('./src/database').getObject(`quiz:attempt:${attemptId}`);
        if (!attempt || attempt.studentId !== uid) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await QuizAttempt.submitAnswer(attemptId, questionId, answerId);

        return res.json({ success: true });
    } catch (err) {
        console.error('Error submitting answer:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * POST /api/quiz/attempt/:attemptId/submit
 * Submit entire attempt for grading
 */
exports.submitAttempt = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: 'Not logged in' });
        }

        // Verify ownership
        const db = require.main.require('./src/database');
        const attempt = await db.getObject(`quiz:attempt:${attemptId}`);
        if (!attempt || attempt.studentId !== uid) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await QuizAttempt.submitAttempt(attemptId);

        return res.json(result);
    } catch (err) {
        console.error('Error submitting attempt:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * GET /api/quiz/attempt/:attemptId
 * Get attempt results
 */
exports.getAttempt = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: 'Not logged in' });
        }

        const attempt = await QuizAttempt.getAttempt(attemptId, uid);
        if (!attempt) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        return res.json(attempt);
    } catch (err) {
        console.error('Error getting attempt:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/quiz/:qid/attempts
 * Get all student attempts for a quiz (faculty only)
 */
exports.getQuizAttempts = async (req, res) => {
    try {
        const { qid } = req.params;
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: 'Not logged in' });
        }

        const attempts = await QuizAttempt.getQuizAttempts(qid, uid);
        const user = require.main.require('./src/user');

        // Enrich with student names
        const enriched = await Promise.all(
            attempts.map(async attempt => ({
                ...attempt,
                studentName: (await user.getUserFields(attempt.studentId, ['username'])).username
            }))
        );

        return res.json(enriched);
    } catch (err) {
        console.error('Error getting quiz attempts:', err);
        res.status(err.message.includes('authorized') ? 403 : 500).json({ error: err.message });
    }
};

/**
 * GET /api/quiz/:qid/student/:studentId/attempts
 * Get specific student's attempts (faculty only)
 */
exports.getStudentAttempts = async (req, res) => {
    try {
        const { qid, studentId } = req.params;
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: 'Not logged in' });
        }

        const attempts = await QuizAttempt.getStudentAttempts(qid, studentId, uid);

        return res.json(attempts);
    } catch (err) {
        console.error('Error getting student attempts:', err);
        res.status(err.message.includes('authorized') ? 403 : 500).json({ error: err.message });
    }
};

/**
 * DELETE /api/quiz/attempt/:attemptId
 * Delete an attempt (faculty only)
 */
exports.deleteAttempt = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const uid = req.user?.uid;

        if (!uid) {
            return res.status(401).json({ error: 'Not logged in'},
                await QuizAttempt.delete(attemptId, uid);
                return res.json({ success: true });
            } catch (err) {
                console.error('Error deleting attempt:', err);
                res.status(err.message.includes('authorized') ? 403 : 500).json({ error: err.message });
            }
        };
