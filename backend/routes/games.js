const express = require('express');
const { z } = require('zod');
const { requireLogin, requireRole } = require('../middlewares/auth');
const gameService = require('../services/gameService');

const router = express.Router();
router.use(requireLogin);
const staffOnly = requireRole('ADMIN', 'TEACHER');
const gameInput = z.object({
  bookId: z.string().trim().min(1),
  questionType: z.enum(['MC', 'TF']),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  questionCount: z.coerce.number().int().positive().max(10000),
  cupReward: z.coerce.number().int().positive().max(100000),
});
const editInput = gameInput.omit({ bookId: true, questionType: true });
function fail(res, error) { return res.status(error.statusCode || 500).json({ error: { code: error.code || 'GAME_ERROR', message: error.message || 'Đã có lỗi xảy ra.' } }); }

router.get('/', async (_req, res, next) => { try { res.json({ items: await gameService.listGames() }); } catch (error) { next(error); } });
router.get('/sessions/:sessionId', async (req, res) => { try { res.json({ data: await gameService.getSession(req.params.sessionId, req.session.user.id) }); } catch (error) { return fail(res, error); } });
router.get('/question-bank-books', requireRole('ADMIN', 'TEACHER'), async (req, res, next) => { try { res.json({ items: await gameService.listQuestionBankBooks(req.query.search) }); } catch (error) { next(error); } });
router.get('/:id', async (req, res) => { try { const game = await gameService.getGame(req.params.id); if (!game) return res.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: 'Không tìm thấy game.' } }); res.json({ data: game }); } catch (error) { return fail(res, error); } });
router.get('/:id/questions', async (req, res) => { try { const game = await gameService.getGame(req.params.id); if (!game) return res.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: 'Không tìm thấy game.' } }); res.json({ data: { game, questions: await gameService.previewQuestions(req.params.id) } }); } catch (error) { return fail(res, error); } });

router.post('/', staffOnly, async (req, res) => { const parsed = gameInput.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }); try { res.status(201).json({ data: await gameService.createGame({ ...parsed.data, createdBy: req.session.user.id }) }); } catch (error) { fail(res, error); } });
router.patch('/:id', staffOnly, async (req, res) => { const parsed = editInput.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }); try { res.json({ data: await gameService.updateGame(req.params.id, parsed.data) }); } catch (error) { fail(res, error); } });
router.delete('/:id', staffOnly, async (req, res, next) => { try { if (!await gameService.deleteGame(req.params.id)) return res.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: 'Không tìm thấy game.' } }); res.status(204).end(); } catch (error) { next(error); } });

router.post('/:id/start', async (req, res) => { try { const session = await gameService.startSession(req.params.id, req.session.user.id); res.status(201).json({ data: session }); } catch (error) { fail(res, error); } });
router.post('/sessions/:sessionId/answer', async (req, res) => { const parsed = z.object({ questionId: z.string().min(1), selectedAnswer: z.union([z.string(), z.boolean()]) }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Câu trả lời không hợp lệ.' } }); try { res.json({ data: await gameService.answer(req.params.sessionId, req.session.user.id, parsed.data.questionId, parsed.data.selectedAnswer) }); } catch (error) { fail(res, error); } });
router.post('/sessions/:sessionId/complete', async (req, res) => { try { res.json({ data: await gameService.complete(req.params.sessionId, req.session.user.id) }); } catch (error) { fail(res, error); } });
router.get('/sessions/:sessionId/result', async (req, res) => { try { res.json({ data: await gameService.resultFor(req.params.sessionId, req.session.user.id) }); } catch (error) { fail(res, error); } });

module.exports = router;
