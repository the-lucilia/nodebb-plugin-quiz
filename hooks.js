'use strict';

const Quiz = require('./models/Quiz');
const QuizAttempt = require('./models/QuizAttempt');
const user = require.main.require('./src/user');
const privileges = require.main.require('./src/privileges');

exports.attachQuizToPost = async (postData) => {
    /**
     * Attach quiz data to post if it contains a quiz reference
     * Called when a post is retrieved
     */
    if (!postData || !postData.content) {
        return postData;
    }

    // Look for [quiz=123] format
    const quizMatch = postData.content.match(/\[quiz=(\d+)\]/);
    if (quizMatch) {
        const qid = parseInt(quizMatch[1], 10);
        try {
            const quiz = await Quiz.getById(qid);
            if (quiz) {
                postData.quiz = quiz;
            }
        } catch (err) {
            console.error('Error attaching quiz to post:', err);
        }
    }

    return postData;
};

exports.parseQuizContent = async (postContent) => {
    /**
     * Convert [quiz=123] tags to div containers
     * Frontend JS will hydrate these divs with quiz UI
     */
    return postContent.replace(
        /\[quiz=(\d+)\]/g,
        '<div class="quiz-wrapper" data-quiz-id="$1"></div>'
    );
};

exports.registerAdminPages = async (data) => {
    /**
     * Register admin dashboard pages
     */
    if (!data.routes) {
        data.routes = [];
    }

    data.routes.push({
        route: '/admin/plugins/quiz',
        icon: 'fa-list-check',
        name: 'Quiz Management'
    });

    return data;
};
