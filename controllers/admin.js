'use strict';

const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

exports.index = async (req, res) => {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.redirect('/login');

        const quizzes = await Quiz.getByCreator(uid);
        return res.render('admin/plugins/quiz/dashboard', { quizzes });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error');
    }
};
