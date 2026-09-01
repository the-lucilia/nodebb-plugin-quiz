'use strict';

const db = require.main.require('./src/database');
const groups = require.main.require('./src/groups');

class Quiz {
    /**
     * Create a new quiz
     */
    static async create(quizData) {
        const qid = await db.incr('quiz:uid');

        const quizObj = {
            qid,
            title: quizData.title,
            description: quizData.description,
            postId: quizData.postId,
            categoryId: quizData.categoryId,
            groupId: quizData.groupId,
            createdBy: quizData.createdBy,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            settings: {
                randomizeQuestions: quizData.settings?.randomizeQuestions ?? true,
                randomizeAnswers: quizData.settings?.randomizeAnswers ?? true,
                numQuestions: quizData.settings?.numQuestions || 5,
                allowRetake: quizData.settings?.allowRetake ?? false,
                maxAttempts: quizData.settings?.maxAttempts || 1,
                passingScore: quizData.settings?.passingScore || 70,
                showAnswersAfter: quizData.settings?.showAnswersAfter ?? false,
                showAnswersAfterDate: quizData.settings?.showAnswersAfterDate || null,
                timeLimit: quizData.settings?.timeLimit || 0
            },
            status: 'draft'
        };

        // Store quiz
        await db.setObject(`quiz:${qid}`, quizObj);
        await db.sortedSetAdd('quizzes:all', Date.now(), qid);
        if (quizData.postId) {
            await db.set(`quiz:postId:${quizData.postId}`, qid);
        }
        if (quizData.categoryId) {
            await db.sortedSetAdd(`quizzes:byCategory:${quizData.categoryId}`, Date.now(), qid);
        }

        return quizObj;
    }

    /**
     * Get quiz by ID
     */
    static async getById(qid) {
        return await db.getObject(`quiz:${qid}`);
    }

    /**
     * Get quiz by post ID
     */
    static async getByPostId(postId) {
        const qid = await db.get(`quiz:postId:${postId}`);
        if (!qid) return null;
        return this.getById(qid);
    }

    /**
     * Update quiz
     */
    static async update(qid, updateData) {
        const quiz = await this.getById(qid);
        if (!quiz) throw new Error('Quiz not found');

        const updated = { ...quiz, ...updateData, updatedAt: Date.now() };
        await db.setObject(`quiz:${qid}`, updated);
        return updated;
    }

    /**
     * Publish quiz (make active)
     */
    static async publish(qid) {
        const quiz = await this.getById(qid);
        if (!quiz) throw new Error('Quiz not found');
        if (!quiz.settings.numQuestions) throw new Error('numQuestions not set');

        const questionCount = await db.listLength(`quiz:${qid}:questions`);
        if (questionCount === 0) throw new Error('Quiz has no questions');

        return await this.update(qid, { status: 'active' });
    }

    /**
     * Add question to quiz
     */
    static async addQuestion(qid, questionData) {
        const quiz = await this.getById(qid);
        if (!quiz) throw new Error('Quiz not found');

        const questionId = await db.incr(`quiz:${qid}:questionId`);

        const question = {
            questionId,
            qid,
            questionText: questionData.questionText,
            questionType: 'multiple-choice',
            answers: questionData.answers, // Array of { text, isCorrect }
            explanation: questionData.explanation || '',
            createdAt: Date.now()
        };

        await db.setObject(`quiz:${qid}:question:${questionId}`, question);
        await db.listPush(`quiz:${qid}:questions`, questionId);

        return question;
    }

    /**
     * Get all questions for a quiz
     */
    static async getQuestions(qid) {
        const questionIds = await db.listRange(`quiz:${qid}:questions`, 0, -1);
        const questions = await Promise.all(
            questionIds.map(qId => db.getObject(`quiz:${qid}:question:${qId}`))
        );
        return questions.filter(q => q !== null);
    }

    /**
     * Get single question
     */
    static async getQuestion(qid, questionId) {
        return await db.getObject(`quiz:${qid}:question:${questionId}`);
    }

    /**
     * Update question
     */
    static async updateQuestion(qid, questionId, questionData) {
        const question = await this.getQuestion(qid, questionId);
        if (!question) throw new Error('Question not found');

        const updated = { ...question, ...questionData, updatedAt: Date.now() };
        await db.setObject(`quiz:${qid}:question:${questionId}`, updated);
        return updated;
    }

    /**
     * Delete question
     */
    static async deleteQuestion(qid, questionId) {
        const questions = await db.listRange(`quiz:${qid}:questions`, 0, -1);
        const index = questions.indexOf(String(questionId));
        if (index !== -1) {
            await db.listRemoveIndex(`quiz:${qid}:questions`, index);
        }
        await db.delete(`quiz:${qid}:question:${questionId}`);
    }

    /**
     * Select random questions from pool
     */
    static async selectRandomQuestions(qid, count) {
        const questions = await this.getQuestions(qid);

        if (count > questions.length) {
            count = questions.length;
        }

        // Fisher-Yates shuffle
        const shuffled = [...questions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled.slice(0, count);
    }

    /**
     * Randomize answer order for display
     */
    static randomizeAnswers(question) {
        const copy = { ...question };
        if (copy.answers && copy.answers.length > 1) {
            copy.answers = [...copy.answers].sort(() => Math.random() - 0.5);
        }
        return copy;
    }

    /**
     * Check if user can view quiz
     */
    static async canView(uid, qid) {
        const quiz = await this.getById(qid);
        if (!quiz) return false;

        // Faculty (creator) can always view
        if (uid === quiz.createdBy) return true;

        // If group-restricted, check membership
        if (quiz.groupId) {
            return await groups.isMember(uid, quiz.groupId);
        }

        return true;
    }

    /**
     * Check if user can take quiz
     */
    static async canTake(uid, qid) {
        const quiz = await this.getById(qid);
        if (!quiz) return false;

        // Faculty can't take their own quiz
        if (uid === quiz.createdBy) return false;

        // Must be able to view it
        return await this.canView(uid, qid);
    }

    /**
     * Check if user can edit quiz (is faculty)
     */
    static async canEdit(uid, qid) {
        const quiz = await this.getById(qid);
        if (!quiz) return false;
        return uid === quiz.createdBy;
    }

    /**
     * Get all quizzes created by a user
     */
    static async getByCreator(uid) {
        const quizzes = await db.getSortedSetRange('quizzes:all', 0, -1);
        const results = [];

        for (const qid of quizzes) {
            const quiz = await this.getById(qid);
            if (quiz && quiz.createdBy === uid) {
                results.push(quiz);
            }
        }

        return results;
    }
}

module.exports = Quiz;
