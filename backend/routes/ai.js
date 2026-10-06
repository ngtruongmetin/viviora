const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { requireLogin, requireRole } = require('../middlewares/auth');
const ai = require('../services/aiService');

const router = express.Router();
const messageSchema = z.object({ content: z.string().trim().min(1, 'Hãy nhập câu hỏi.').max(1200, 'Câu hỏi quá dài.') });
const configSchema = z.object({
  provider: z.string().trim().min(1).max(40).optional(), baseUrl: z.string().trim().url().max(300).optional(), model: z.string().trim().min(1).max(160).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(), maxTokens: z.coerce.number().int().min(128).max(4096).optional(), systemPrompt: z.string().trim().min(40).max(8000).optional(),
  isEnabled: z.boolean().optional(), apiKey: z.string().trim().min(8).max(1000).optional(), clearCredential: z.boolean().optional(),
});
const sendLimiter = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: { code: 'AI_RATE_LIMITED', message: 'Bạn đã gửi quá nhiều câu hỏi, hãy thử lại sau.' } } });
function fail(res, status, code, message) { return res.status(status).json({ error: { code, message } }); }

router.get('/conversations', requireLogin, async (req, res, next) => { try { res.json({ items: await ai.listConversations(req.session.user.id) }); } catch (error) { next(error); } });
router.post('/conversations', requireLogin, async (req, res, next) => { try { res.status(201).json({ data: await ai.createConversation(req.session.user.id) }); } catch (error) { next(error); } });
router.get('/conversations/:conversationId', requireLogin, async (req, res, _next) => { try { const item = await ai.conversation(req.session.user.id, req.params.conversationId); if (!item) return fail(res, 404, 'AI_CONVERSATION_NOT_FOUND', 'Không tìm thấy cuộc trò chuyện.'); res.json({ data: item }); } catch (error) { _next(error); } });
router.delete('/conversations/:conversationId', requireLogin, async (req, res, next) => { try { const deleted = await ai.removeConversation(req.session.user.id, req.params.conversationId); if (!deleted) return fail(res, 404, 'AI_CONVERSATION_NOT_FOUND', 'Không tìm thấy cuộc trò chuyện.'); res.status(204).end(); } catch (error) { next(error); } });

router.post('/conversations/:conversationId/messages', requireLogin, sendLimiter, async (req, res, _next) => {
  const parsed = messageSchema.safeParse(req.body || {}); if (!parsed.success) return fail(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0].message);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders?.();
  const event = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    event('status', { status: 'searching' });
    const result = await ai.answer({ userId: req.session.user.id, conversationId: req.params.conversationId, text: parsed.data.content, onDelta: (delta) => event('delta', { delta }) });
    event('books', { books: result.books }); event('done', { title: result.title }); res.end();
  } catch (error) {
    const code = error.code || 'AI_PROVIDER_ERROR'; const status = code === 'NOT_FOUND' ? 404 : code.startsWith('AI_') ? 409 : 502;
    event('error', { code, status, message: error.message || 'Không thể nhận phản hồi từ AI.' }); res.end();
  }
});

router.get('/admin/config', requireRole('ADMIN'), async (_req, res, next) => { try { res.json({ data: await ai.getPublicConfig() }); } catch (error) { next(error); } });
router.put('/admin/config', requireRole('ADMIN'), async (req, res, next) => { const parsed = configSchema.safeParse(req.body || {}); if (!parsed.success) return fail(res, 400, 'VALIDATION_ERROR', parsed.error.issues[0].message); try { res.json({ data: await ai.updateConfig(parsed.data, req.session.user.id) }); } catch (error) { if (error.message.includes('secret')) return fail(res, 503, 'AI_SECRET_UNAVAILABLE', 'Docker secret cho AI chưa sẵn sàng.'); next(error); } });
router.get('/admin/stats', requireRole('ADMIN'), async (_req, res, next) => { try { res.json({ data: await ai.stats() }); } catch (error) { next(error); } });
router.get('/admin/models', requireRole('ADMIN'), async (_req, res) => { try { res.json({ data: await ai.models() }); } catch (error) { res.status(502).json({ error: { code: error.code || 'AI_PROVIDER_ERROR', message: error.message || 'Không thể tải danh sách model.' } }); } });
router.post('/admin/test', requireRole('ADMIN'), async (_req, res, _next) => { try { res.json({ data: await ai.testProvider() }); } catch (error) { res.status(502).json({ error: { code: error.code || 'AI_PROVIDER_ERROR', message: error.message || 'Không thể kết nối provider.' } }); } });
module.exports = router;
