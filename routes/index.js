'use strict';

module.exports = (app, middleware) => {
    const api = require('../controllers/api');
    const quiz = require('../controllers/quiz');

    // Student endpoints
    app.get('/api/quiz/:qid', api.getQuiz);
    app.post('/api/quiz/:qid/start', middleware.requireUser, api.startQuiz);
    app.post('/api/quiz/attempt/:attemptId/answer', middleware.requireUser, api.submitAnswer);
    app.post('/api/quiz/attempt/:attemptId/submit', middleware.requireUser, api.submitAttempt);
    app.get('/api/quiz/attempt/:attemptId', middleware.requireUser, api.getAttempt);

    // Faculty endpoints
    app.get('/api/quiz/:qid/attempts', middleware.requireUser, api.getQuizAttempts);
    app.get('/api/quiz/:qid/student/:studentId/attempts', middleware.requireUser, api.getStudentAttempts);
    app.delete('/api/quiz/attempt/:attemptId', middleware.requireUser, api.deleteAttempt);

    // Admin pages
    app.get('/admin/plugins/quiz', middleware.admin.checkPrivileges, quiz.adminDashboard);
    app.get('/admin/plugins/quiz/create', middleware.admin.checkPrivileges, quiz.createQuizPage);
    app.get('/admin/plugins/quiz/:qid', middleware.admin.checkPrivileges, quiz.editQuizPage);
};
