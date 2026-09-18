const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const { requireRole, requireLogin } = require('../middlewares/auth');
const { coverDirectory, ensureValidImage, localCoverPrefix, removeLocalCover } = require('../services/libraryCover');
const importStore = require('../services/libraryImportStore');
const { parseLibraryWorkbook } = require('../services/libraryParser');
const libraryService = require('../services/libraryService');

const router = express.Router();
const xlsxMimeTypes = new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const importDirectory = path.join(uploadDirectory, 'library-imports');
const maxImportFileSize = Number(process.env.LIBRARY_IMPORT_MAX_SIZE || 10 * 1024 * 1024);
const maxCoverFileSize = Number(process.env.LIBRARY_COVER_MAX_SIZE || 5 * 1024 * 1024);
const maxRows = Number(process.env.LIBRARY_IMPORT_MAX_ROWS || 50000);
const previewLimit = Number(process.env.LIBRARY_IMPORT_PREVIEW_LIMIT || 30);

const textField = (maximum) => z.string().trim().max(maximum).optional().transform((value) => value || null);
const collectionSchema = z.object({
  name: z.string().trim().min(1, 'Tên kho sách là bắt buộc.').max(160, 'Tên kho sách không được quá 160 ký tự.'),
  description: textField(1000),
});
const externalCoverUrl = z
  .string()
  .trim()
  .max(500, 'Liên kết ảnh bìa không được quá 500 ký tự.')
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Liên kết ảnh bìa phải bắt đầu bằng http:// hoặc https://.');
const nullableNumber = (minimum, maximum, label, integer = false) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    (integer ? z.coerce.number().int(`${label} không hợp lệ.`) : z.coerce.number())
      .finite(`${label} không hợp lệ.`)
      .min(minimum, `${label} không hợp lệ.`)
      .max(maximum, `${label} không hợp lệ.`)
      .nullable(),
  );
const optionalExternalCoverUrl = z.preprocess((value) => (value === null ? '' : value), externalCoverUrl.optional());
const bookSchema = z.object({
  title: z.string().trim().min(1, 'Tên sách là bắt buộc.').max(500, 'Tên sách không được quá 500 ký tự.'),
  author: textField(300),
  publisher: textField(300),
  publicationYear: nullableNumber(1000, new Date().getUTCFullYear() + 1, 'Năm xuất bản', true),
  price: nullableNumber(0, 999999999999.99, 'Đơn giá'),
  category: textField(160),
  cutter: textField(160),
  coverUrl: optionalExternalCoverUrl,
});

function validationError(res, result) {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: result.error.issues[0].message } });
}

function displayFileName(value) {
  return path
    .basename(String(value || ''))
    .split('')
    .filter((character) => character.charCodeAt(0) > 31 && !'<>:"/\\|?*'.includes(character))
    .join('')
    .trim()
    .slice(0, 255);
}

function importResponse(item) {
  return {
    temporaryImportId: item.id,
    expiresAt: new Date(item.expiresAt).toISOString(),
    collection: { name: item.collection.name, description: item.collection.description },
    summary: item.parsed.summary,
    errors: item.parsed.errors,
    books: item.parsed.books,
  };
}

function makeUpload({ directory, maxSize, mimeTypes, extension }) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => fs.mkdir(directory, { recursive: true }, (error) => callback(error, directory)),
      filename: (_req, _file, callback) => callback(null, `${crypto.randomUUID()}${extension}`),
    }),
    limits: { fileSize: maxSize, files: 1 },
    fileFilter: (_req, file, callback) => {
      const isSpreadsheet = extension === '.xlsx' && path.extname(file.originalname || '').toLowerCase() === '.xlsx';
      if (!mimeTypes.has(file.mimetype) || (extension === '.xlsx' && !isSpreadsheet)) {
        const error = new Error('Định dạng file không được hỗ trợ.');
        error.code = 'INVALID_UPLOAD_TYPE';
        return callback(error);
      }
      callback(null, true);
    },
  });
}

const importUpload = makeUpload({ directory: importDirectory, maxSize: maxImportFileSize, mimeTypes: xlsxMimeTypes, extension: '.xlsx' });
const coverUpload = makeUpload({ directory: coverDirectory, maxSize: maxCoverFileSize, mimeTypes: imageMimeTypes, extension: '.upload' });

function singleUpload(upload, field, tooLargeCode, invalidTypeCode) {
  return (req, res, next) => {
    upload.single(field)(req, res, (error) => {
      if (!error) return next();
      if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: { code: tooLargeCode, message: 'File vượt quá dung lượng cho phép.' } });
      if (error.code === 'INVALID_UPLOAD_TYPE') return res.status(400).json({ error: { code: invalidTypeCode, message: error.message } });
      next(error);
    });
  };
}

const uploadImportFile = singleUpload(importUpload, 'file', 'LIBRARY_IMPORT_TOO_LARGE', 'INVALID_LIBRARY_IMPORT_TYPE');
const uploadCoverFile = singleUpload(coverUpload, 'cover', 'LIBRARY_COVER_TOO_LARGE', 'INVALID_LIBRARY_COVER_TYPE');

router.get('/collections', async (req, res, next) => {
  try {
    res.json(await libraryService.listCollections(req.query));
  } catch (error) {
    next(error);
  }
});

router.get('/books', async (req, res, next) => {
  try { res.json({ items: await libraryService.searchBooks(req.query) }); } catch (error) { next(error); }
});

router.get('/trending-books', async (req, res, next) => {
  try { res.json({ items: await libraryService.trendingBooks(req.query.limit) }); } catch (error) { next(error); }
});

router.get('/collections/:collectionId', async (req, res, next) => {
  try {
    const collection = await libraryService.getCollection(req.params.collectionId);
    if (!collection) return res.status(404).json({ error: { code: 'COLLECTION_NOT_FOUND', message: 'Không tìm thấy kho sách.' } });
    const [books, categories] = await Promise.all([libraryService.listCollectionBooks(collection.id, req.query), libraryService.listCollectionCategories(collection.id)]);
    res.json({ collection, books: books.items, pagination: books.pagination, categories });
  } catch (error) {
    next(error);
  }
});

router.get('/books/:bookId', async (req, res, next) => {
  try {
    const book = await libraryService.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: { code: 'BOOK_NOT_FOUND', message: 'Không tìm thấy đầu sách.' } });
    res.json({ book });
  } catch (error) {
    next(error);
  }
});

router.post('/books/:bookId/view', requireLogin, async (req, res, next) => {
  try {
    const book = await libraryService.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: { code: 'BOOK_NOT_FOUND', message: 'Không tìm thấy đầu sách.' } });
    const { pool } = require('../database/db');
    await pool.query(`INSERT INTO reading_progress(id,user_id,book_id,progress,minutes)
      VALUES($1,$2,$3,0,0) ON CONFLICT(user_id,book_id) DO UPDATE SET updated_at=CURRENT_TIMESTAMP`, [crypto.randomUUID(), req.session.user.id, book.id]);
    const { evaluateUser } = require('../services/achievementService');
    res.json({ data: { achievementEvents: await evaluateUser(req.session.user.id) } });
  } catch (error) { next(error); }
});

router.post('/collections', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = collectionSchema.safeParse(req.body || {});
    if (!result.success) return validationError(res, result);
    const collection = await libraryService.createCollection({ ...result.data, createdBy: req.session.user.id });
    res.status(201).json({ data: { collection } });
  } catch (error) {
    next(error);
  }
});

router.patch('/collections/:collectionId', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = collectionSchema.safeParse(req.body || {});
    if (!result.success) return validationError(res, result);
    const collection = await libraryService.updateCollection(req.params.collectionId, result.data);
    if (!collection) return res.status(404).json({ error: { code: 'COLLECTION_NOT_FOUND', message: 'Không tìm thấy kho sách.' } });
    res.json({ data: { collection } });
  } catch (error) {
    next(error);
  }
});

router.delete('/collections/:collectionId', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const covers = await libraryService.deleteCollection(req.params.collectionId);
    if (!covers) return res.status(404).json({ error: { code: 'COLLECTION_NOT_FOUND', message: 'Không tìm thấy kho sách.' } });
    await Promise.all(covers.map((cover) => removeLocalCover(cover).catch((error) => console.error('Could not remove deleted collection cover:', error))));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post('/collections/:collectionId/books', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = bookSchema.safeParse(req.body || {});
    if (!result.success) return validationError(res, result);
    const book = await libraryService.createBook(req.params.collectionId, result.data);
    if (!book) return res.status(404).json({ error: { code: 'COLLECTION_NOT_FOUND', message: 'Không tìm thấy kho sách.' } });
    res.status(201).json({ data: { book } });
  } catch (error) {
    next(error);
  }
});

router.patch('/books/:bookId', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = bookSchema.safeParse(req.body || {});
    if (!result.success) return validationError(res, result);
    const current = await libraryService.getBook(req.params.bookId);
    if (!current) return res.status(404).json({ error: { code: 'BOOK_NOT_FOUND', message: 'Không tìm thấy đầu sách.' } });
    const nextCoverUrl = Object.prototype.hasOwnProperty.call(req.body || {}, 'coverUrl') ? result.data.coverUrl || null : current.cover_url;
    const book = await libraryService.updateBook(req.params.bookId, { ...result.data, coverUrl: nextCoverUrl });
    if (current.cover_url !== nextCoverUrl) await removeLocalCover(current.cover_url).catch((error) => console.error('Could not remove replaced book cover:', error));
    res.json({ data: { book } });
  } catch (error) {
    next(error);
  }
});

router.delete('/books/:bookId', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const deleted = await libraryService.deleteBook(req.params.bookId);
    if (!deleted) return res.status(404).json({ error: { code: 'BOOK_NOT_FOUND', message: 'Không tìm thấy đầu sách.' } });
    await removeLocalCover(deleted.cover_url).catch((error) => console.error('Could not remove deleted book cover:', error));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post('/books/:bookId/cover', requireRole('ADMIN'), uploadCoverFile, async (req, res, next) => {
  let temporaryPath;
  try {
    if (!req.file) return res.status(400).json({ error: { code: 'LIBRARY_COVER_REQUIRED', message: 'Hãy chọn ảnh bìa.' } });
    temporaryPath = req.file.path;
    const extension = await ensureValidImage(temporaryPath);
    if (!extension) return res.status(400).json({ error: { code: 'INVALID_LIBRARY_COVER_CONTENT', message: 'Nội dung file không phải ảnh JPG, PNG hoặc WEBP hợp lệ.' } });
    const book = await libraryService.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: { code: 'BOOK_NOT_FOUND', message: 'Không tìm thấy đầu sách.' } });
    const filename = `${crypto.randomUUID()}${extension}`;
    const finalPath = path.join(coverDirectory, filename);
    await fs.promises.rename(temporaryPath, finalPath);
    temporaryPath = null;
    try {
      const updated = await libraryService.updateBookCover(book.id, `${localCoverPrefix}${filename}`);
      await removeLocalCover(book.cover_url).catch((error) => console.error('Could not remove replaced book cover:', error));
      return res.json({ data: { book: updated } });
    } catch (error) {
      await fs.promises.unlink(finalPath).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    next(error);
  } finally {
    if (temporaryPath) await fs.promises.unlink(temporaryPath).catch(() => undefined);
  }
});

router.delete('/books/:bookId/cover', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const current = await libraryService.getBook(req.params.bookId);
    if (!current) return res.status(404).json({ error: { code: 'BOOK_NOT_FOUND', message: 'Không tìm thấy đầu sách.' } });
    const book = await libraryService.updateBookCover(current.id, null);
    await removeLocalCover(current.cover_url).catch((error) => console.error('Could not remove book cover:', error));
    res.json({ data: { book } });
  } catch (error) {
    next(error);
  }
});

router.post('/import/preview', requireRole('ADMIN'), uploadImportFile, async (req, res, next) => {
  let uploadedPath;
  try {
    if (!req.file) return res.status(400).json({ error: { code: 'LIBRARY_IMPORT_FILE_REQUIRED', message: 'Hãy chọn file Excel .xlsx.' } });
    uploadedPath = req.file.path;
    const parsedMetadata = collectionSchema.safeParse(req.body || {});
    if (!parsedMetadata.success) return validationError(res, parsedMetadata);
    const parsed = await parseLibraryWorkbook(uploadedPath, { maxRows, previewLimit });
    const item = importStore.createImport({ userId: req.session.user.id, collection: { ...parsedMetadata.data, importedFileName: displayFileName(req.file.originalname) || 'library-import.xlsx' }, parsed });
    res.status(201).json({ data: importResponse(item) });
  } catch (error) {
    if (error.code && ['INVALID_EXCEL_FILE', 'EMPTY_EXCEL_FILE', 'EXCEL_TOO_LARGE'].includes(error.code)) return res.status(400).json({ error: { code: error.code, message: error.message } });
    next(error);
  } finally {
    if (uploadedPath) await fs.promises.unlink(uploadedPath).catch(() => undefined);
  }
});

router.post('/import/confirm', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const temporaryImportId = typeof req.body?.temporaryImportId === 'string' ? req.body.temporaryImportId : '';
    const item = importStore.beginConfirmation(temporaryImportId, req.session.user.id);
    if (!item) return res.status(404).json({ error: { code: 'IMPORT_PREVIEW_NOT_FOUND', message: 'Bản xem trước đã hết hạn, bị hủy hoặc đang được xử lý.' } });
    if (!item.parsed.allBooks.length) {
      importStore.completeImport(item.id);
      return res.status(400).json({ error: { code: 'IMPORT_HAS_NO_VALID_BOOKS', message: 'Không có đầu sách hợp lệ để nhập kho.' } });
    }
    try {
      const collection = await libraryService.createCollectionFromImport({ collection: item.collection, books: item.parsed.allBooks, userId: req.session.user.id });
      importStore.completeImport(item.id);
      return res.status(201).json({ data: { collection } });
    } catch (error) {
      importStore.releaseConfirmation(item.id);
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.delete('/import/:temporaryImportId', requireRole('ADMIN'), (req, res) => {
  const canceled = importStore.cancelImport(req.params.temporaryImportId, req.session.user.id);
  if (!canceled) return res.status(404).json({ error: { code: 'IMPORT_PREVIEW_NOT_FOUND', message: 'Không tìm thấy bản xem trước để hủy.' } });
  res.status(204).end();
});

module.exports = router;
