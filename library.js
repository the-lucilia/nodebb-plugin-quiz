'use strict';

const hooks = require('./hooks');
const routes = require('./routes');
const controllers = require('./controllers');

// Export main hooks
exports.attachQuizToPost = hooks.attachQuizToPost;
exports.parseQuizContent = hooks.parseQuizContent;
exports.registerAdminPages = hooks.registerAdminPages;

// Export routes initialization
exports.init = async (params) => {
    const app = params.router;
    const middleware = params.middleware;

    // Register all quiz API routes
    routes.register(app, middleware);
};

// Export admin page
exports.admin = {
    route: '/admin/plugins/quiz',
    icon: 'fa-list-check',
    name: 'Quiz Management'
};
