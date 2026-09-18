const express = require('express');
const { requireRole } = require('../middlewares/auth');
const questionBankService = require('../services/questionBankService');
const { questionSchema } = require('../schemas/question');

const router = express.Router();
router.use(requireRole('ADMIN', 'TEACHER'));
router.get('/:questionId', async (req, res, next) => {
  try {
    const question = await questionBankService.getQuestion(req.params.questionId);
    if (!question) return res.status(404).json({ error: { code: 'QUESTION_NOT_FOUND', message: 'Không tìm thấy câu hỏi.' } });
    res.json({ data: question });
  } catch (error) { next(error); }
});
router.patch('/:questionId', async (req, res, next) => {
  try {
    const result = questionSchema.safeParse(req.body || {});
    if (!result.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: result.error.issues[0].message } });
    const current = await questionBankService.getQuestion(req.params.questionId);
    if (!current) return res.status(404).json({ error: { code: 'QUESTION_NOT_FOUND', message: 'Không tìm thấy câu hỏi.' } });
    res.json({ data: await questionBankService.saveQuestion({ bankId: current.question_bank_id, questionId: current.id, ...result.data, userId: req.session.user.id }) });
  } catch (error) { next(error); }
});
router.delete('/:questionId', async (req, res, next) => {
  try {
    if (!await questionBankService.deleteQuestion(req.params.questionId)) return res.status(404).json({ error: { code: 'QUESTION_NOT_FOUND', message: 'Không tìm thấy câu hỏi.' } });
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
