'use strict';

const db = require.main.require('./src/database');
const Quiz = require('./Quiz');

class QuizQuestion {
    /**
     * Validate question data
     */
    static validateQuestionData(questionData) {
        if (!questionData.questionText || questionData.questionText.trim() === '') {
            throw new Error('Question text is required');
        }

        if (!Array.isArray(questionData.answers) || questionData.answers.length < 2) {
            throw new Error('At least 2 answers are required');
        }

        const hasCorrectAnswer = questionData.answers.some(a => a.isCorrect);
        if (!hasCorrectAnswer) {
            throw new Error('At least one answer must be marked as correct');
        }

        // Validate answer structure
        questionData.answers.forEach((answer, index) => {
            if (!answer.text || answer.text.trim() === '') {
                throw new Error(`Answer ${index + 1} text is required`);
            }
        });

        return true;
    }

    /**
     * Create question (wrapper around Quiz.addQuestion)
     */
    static async create(qid, questionData) {
        this.validateQuestionData(questionData);

        const quiz = await Quiz.getById(qid);
        if (!quiz) throw new Error('Quiz not found');

        // Add answerId to each answer if not present
        const answers = questionData.answers.map((answer, index) => ({
            answerId: index,
            text: answer.text,
            isCorrect: answer.isCorrect === true
        }));

        return await Quiz.addQuestion(qid, {
            questionText: questionData.questionText,
            answers,
            explanation: questionData.explanation || ''
        });
    }

    /**
     * Get question without revealing answers
     */
    static async getQuestionForStudent(qid, questionId) {
        const question = await Quiz.getQuestion(qid, questionId);
        if (!question) return null;

        // Hide correctness
        const studentQuestion = { ...question };
        studentQuestion.answers = question.answers.map(a => ({
            answerId: a.answerId,
            text: a.text
        }));

        return studentQuestion;
    }
}

module.exports = QuizQuestion;
