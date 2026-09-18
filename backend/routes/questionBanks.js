const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { z } = require('zod');
const { requireRole } = require('../middlewares/auth');
const questionBankService = require('../services/questionBankService');
const { questionSchema, typeSchema } = require('../schemas/question');
const { parseQuestionWorkbook } = require('../services/questionParser');
const importStore = require('../services/questionImportStore');

const router = express.Router();
const staffOnly = requireRole('ADMIN', 'TEACHER');
const questionImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.QUESTION_IMPORT_MAX_SIZE || 10 * 1024 * 1024), files: 1 },
  fileFilter: (_req, file, callback) => {
    if (path.extname(file.originalname || '').toLowerCase() !== '.xlsx' || file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const error = new Error('Hãy chọn file Excel .xlsx.');
      error.code = 'INVALID_QUESTION_IMPORT_TYPE';
      return callback(error);
    }
    callback(null, true);
  },
});
const uploadQuestionImport = (req, res, next) => questionImportUpload.single('file')(req, res, (error) => {
  if (!error) return next();
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: { code: 'QUESTION_IMPORT_TOO_LARGE', message: 'File vượt quá dung lượng cho phép.' } });
  if (error.code === 'INVALID_QUESTION_IMPORT_TYPE') return res.status(400).json({ error: { code: error.code, message: error.message } });
  return next(error);
});
const importPreview = (item) => ({
  temporaryImportId: item.id,
  expiresAt: new Date(item.expiresAt).toISOString(),
  fileName: item.fileName,
  totalRows: item.parsed.totalRows,
  validRows: item.parsed.validRows,
  invalidRows: item.parsed.invalidRows,
  statistics: item.parsed.statistics,
  rows: item.parsed.rows,
  errors: item.parsed.errors,
});

function validationError(res, result) { return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: result.error.issues[0].message } }); }
function handleError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: { code: error.code || 'QUESTION_BANK_ERROR', message: error.message } });
  if (error.code === '23505') return res.status(409).json({ error: { code: 'QUESTION_BANK_EXISTS', message: 'Dữ liệu đã tồn tại.' } });
  return next(error);
}

router.use(staffOnly);
router.post('/:bankId/questions/import/preview', uploadQuestionImport, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: { code: 'QUESTION_IMPORT_FILE_REQUIRED', message: 'Hãy chọn file Excel .xlsx.' } });
    const bank = await questionBankService.getBank(req.params.bankId);
    if (!bank) return res.status(404).json({ error: { code: 'QUESTION_BANK_NOT_FOUND', message: 'Không tìm thấy kho câu hỏi.' } });
    const parsed = await parseQuestionWorkbook(req.file.buffer, { maxRows: Number(process.env.QUESTION_IMPORT_MAX_ROWS || 50000) });
    const item = importStore.createImport({ userId: req.session.user.id, bankId: req.params.bankId, fileName: path.basename(req.file.originalname), parsed });
    res.status(201).json({ data: importPreview(item) });
  } catch (error) {
    if (['INVALID_EXCEL_FILE', 'EMPTY_EXCEL_FILE', 'EXCEL_TOO_LARGE'].includes(error.code)) return res.status(400).json({ error: { code: error.code, message: error.message } });
    next(error);
  }
});
router.post('/:bankId/questions/import/confirm', async (req, res, next) => {
  try {
    const temporaryImportId = typeof req.body?.temporaryImportId === 'string' ? req.body.temporaryImportId : '';
    const item = importStore.beginConfirmation(temporaryImportId, req.session.user.id, req.params.bankId);
    if (!item) return res.status(404).json({ error: { code: 'IMPORT_PREVIEW_NOT_FOUND', message: 'Bản xem trước đã hết hạn, bị hủy hoặc không thuộc kho hiện tại.' } });
    if (item.parsed.invalidRows > 0) {
      importStore.releaseConfirmation(item.id);
      return res.status(400).json({ error: { code: 'IMPORT_HAS_ERRORS', message: 'Không thể nhập file còn lỗi dữ liệu.' } });
    }
    try {
      const bank = await questionBankService.importQuestions({ bankId: req.params.bankId, rows: item.parsed.allRows, userId: req.session.user.id });
      importStore.completeImport(item.id);
      return res.status(201).json({ data: { bank, imported: item.parsed.validRows } });
    } catch (error) {
      importStore.releaseConfirmation(item.id);
      throw error;
    }
  } catch (error) { handleError(error, res, next); }
});
router.delete('/:bankId/questions/import/:temporaryImportId', (req, res) => {
  if (!importStore.cancelImport(req.params.temporaryImportId, req.session.user.id, req.params.bankId)) return res.status(404).json({ error: { code: 'IMPORT_PREVIEW_NOT_FOUND', message: 'Không tìm thấy bản xem trước để hủy.' } });
  res.status(204).end();
});
router.get('/', async (_req, res, next) => { try { res.json({ items: await questionBankService.listBanks() }); } catch (error) { next(error); } });
router.get('/by-book/:bookId', async (req, res, next) => { try { const bank = await questionBankService.getBankByBook(req.params.bookId); if (!bank) return res.status(404).json({ error: { code: 'QUESTION_BANK_NOT_FOUND', message: 'Sách chưa có kho câu hỏi.' } }); res.json({ data: bank }); } catch (error) { next(error); } });
router.post('/by-book/:bookId', async (req, res, next) => { try { res.status(201).json({ data: await questionBankService.createBank(req.params.bookId, req.session.user.id) }); } catch (error) { handleError(error, res, next); } });
router.get('/:bankId', async (req, res, next) => { try { const bank = await questionBankService.getBank(req.params.bankId); if (!bank) return res.status(404).json({ error: { code: 'QUESTION_BANK_NOT_FOUND', message: 'Không tìm thấy kho câu hỏi.' } }); res.json({ data: bank }); } catch (error) { next(error); } });
router.get('/:bankId/questions', async (req, res, next) => { try { const type = req.query.type ? typeSchema.parse(req.query.type) : undefined; res.json({ items: await questionBankService.listQuestions(req.params.bankId, type) }); } catch (error) { if (error instanceof z.ZodError) return validationError(res, { error }); next(error); } });
router.post('/:bankId/questions', async (req, res, next) => { try { const result = questionSchema.safeParse(req.body || {}); if (!result.success) return validationError(res, result); res.status(201).json({ data: await questionBankService.saveQuestion({ bankId: req.params.bankId, ...result.data, userId: req.session.user.id }) }); } catch (error) { handleError(error, res, next); } });
router.patch('/:bankId', async (req, res, next) => { try { const result = z.object({ bookId: z.string().trim().min(1) }).safeParse(req.body || {}); if (!result.success) return validationError(res, result); const bank = await questionBankService.updateBank(req.params.bankId, result.data.bookId); if (!bank) return res.status(404).json({ error: { code: 'QUESTION_BANK_NOT_FOUND', message: 'Không tìm thấy kho câu hỏi.' } }); res.json({ data: bank }); } catch (error) { handleError(error, res, next); } });
router.delete('/:bankId', async (req, res, next) => { try { if (!await questionBankService.deleteBank(req.params.bankId)) return res.status(404).json({ error: { code: 'QUESTION_BANK_NOT_FOUND', message: 'Không tìm thấy kho câu hỏi.' } }); res.status(204).end(); } catch (error) { next(error); } });
router.patch('/:bankId/questions/:questionId', async (req, res, next) => { try { const result = questionSchema.safeParse(req.body || {}); if (!result.success) return validationError(res, result); res.json({ data: await questionBankService.saveQuestion({ bankId: req.params.bankId, questionId: req.params.questionId, ...result.data, userId: req.session.user.id }) }); } catch (error) { handleError(error, res, next); } });
router.delete('/:bankId/questions/:questionId', async (req, res, next) => { try { if (!await questionBankService.deleteQuestion(req.params.questionId)) return res.status(404).json({ error: { code: 'QUESTION_NOT_FOUND', message: 'Không tìm thấy câu hỏi.' } }); res.status(204).end(); } catch (error) { next(error); } });

module.exports = router;
