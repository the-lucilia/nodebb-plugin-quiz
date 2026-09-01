'use strict';

const Quiz = require('../models/Quiz');
const QuizQuestion = require('../models/QuizQuestion');

exports.adminDashboard = async (req, res) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.redirect('/login');

        const quizzes = await Quiz.getByCreator(uid);
        return res.render('admin/plugins/quiz/dashboard', { quizzes });
    } catch (err) {
        console.error('Error loading dashboard:', err);
        res.status(500).send('Error loading dashboard');
    }
};

exports.createQuizPage = async (req, res) => {
    return res.render('admin/plugins/quiz/create');
};

exports.editQuizPage = async (req, res) => {
    try {
        const { qid } = req.params;
        const uid = req.user?.uid;
        const quiz = await Quiz.getById(qid);

        if (!quiz || quiz.createdBy !== uid) {
            return res.status(403).send('Not authorized');
        }

        const questions = await Quiz.getQuestions(qid);
        return res.render('admin/plugins/quiz/edit', { quiz, questions });
    } catch (err) {
        res.status(500).send('Error loading quiz');
    }
};
