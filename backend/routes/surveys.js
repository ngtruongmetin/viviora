const express = require('express');
const { requireLogin, requireRole } = require('../middlewares/auth');
const service = require('../services/surveyService');
const { buildWorkbook } = require('../services/surveyResponseExportService');
const { pool, all, get } = require('../database/db');
const crypto = require('node:crypto');
const router = express.Router();
async function editable(id) {
  const survey = await get('SELECT status FROM surveys WHERE id=?', [id]);
  if (!survey) throw Object.assign(new Error('Không tìm thấy khảo sát.'), { status: 404 });
  if (survey.status === 'PUBLISHED')
    throw Object.assign(new Error('Phiếu đã xuất bản. Hãy hủy xuất bản trước khi chỉnh sửa.'), {
      status: 409,
    });
  return survey;
}
router.get('/status', requireLogin, async (req, res, next) => {
  try {
    res.json({ data: await service.activeFor(req.session.user) });
  } catch (e) {
    next(e);
  }
});
router.get('/active', requireLogin, async (req, res, next) => {
  try {
    const data = await service.activeFor(req.session.user);
    if (!data.eligible)
      return res.status(403).json({ error: { message: 'Chi danh cho hoc sinh.' } });
    res.json({ data: data.survey });
  } catch (e) {
    next(e);
  }
});
router.post('/submit', requireLogin, async (req, res, next) => {
  try {
    res.status(201).json({ data: await service.submit(req.session.user, req.body?.answers || {}) });
  } catch (e) {
    res
      .status(e.code === 'FORBIDDEN' ? 403 : e.code === 'DUPLICATE' ? 409 : 400)
      .json({ error: { code: e.code || 'VALIDATION_ERROR', message: e.message } });
  }
});
router.use('/admin', requireRole('ADMIN'));
router.get('/admin', async (_req, res, next) => {
  try {
    await service.ensureDefault();
    res.json({ items: await all('SELECT * FROM surveys ORDER BY created_at DESC') });
  } catch (e) {
    next(e);
  }
});
router.get('/admin/:id', async (req, res, next) => {
  try {
    const data = await service.detail(req.params.id);
    if (!data) return res.status(404).end();
    res.json({ data });
  } catch (e) {
    next(e);
  }
});
router.get('/admin/:id/dashboard', async (req, res, next) => {
  try {
    res.json({ data: await service.dashboard(req.params.id) });
  } catch (e) {
    next(e);
  }
});
router.get('/admin/:id/export', async (req, res, next) => {
  try {
    const survey = await service.detail(req.params.id);
    const rows = await all(
      `SELECT sr.id response_id,sr.grade_snapshot,sr.gender_snapshot,sa.question_snapshot,sa.answer FROM survey_responses sr JOIN survey_answers sa ON sa.response_id=sr.id WHERE sr.survey_id=? ORDER BY sr.submitted_at`,
      [req.params.id],
    );
    const header = ['response_code', 'grade', 'gender', 'question_code', 'question', 'answer'];
    const csv = [
      header,
      ...rows.map((r) => [
        r.response_id,
        r.grade_snapshot || '',
        r.gender_snapshot || '',
        r.question_snapshot.code,
        r.question_snapshot.content,
        JSON.stringify(r.answer),
      ]),
    ]
      .map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    res
      .type('text/csv')
      .attachment('viviora-post-use-survey.csv')
      .send('\uFEFF' + csv);
  } catch (e) {
    next(e);
  }
});
router.get('/admin/:id/export.xlsx', async (req, res, next) => {
  try {
    const rows = await all(
      `SELECT sr.id response_id,sr.user_id,u.name full_name,sr.submitted_at,sr.grade_snapshot,sr.gender_snapshot,sa.question_snapshot,sa.answer FROM survey_responses sr JOIN users u ON u.id=sr.user_id JOIN survey_answers sa ON sa.response_id=sr.id WHERE sr.survey_id=? ORDER BY sr.submitted_at,sr.id`,
      [req.params.id],
    );
    const workbook = await buildWorkbook(rows);
    res
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .attachment('viviora-post-use-survey-responses.xlsx')
      .send(Buffer.from(workbook));
  } catch (e) {
    next(e);
  }
});
router.patch('/admin/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.status) {
      if (!['DRAFT', 'PUBLISHED', 'UNPUBLISHED'].includes(b.status))
        return res.status(400).json({ error: { message: 'Trạng thái không hợp lệ.' } });
      if (b.status === 'PUBLISHED')
        await pool.query(
          "UPDATE surveys SET status='UNPUBLISHED',is_active=false WHERE status='PUBLISHED' AND id<>$1",
          [req.params.id],
        );
      await pool.query('UPDATE surveys SET status=$1,is_active=$2,updated_at=NOW() WHERE id=$3', [
        b.status,
        b.status === 'PUBLISHED',
        req.params.id,
      ]);
    } else {
      await editable(req.params.id);
      await pool.query(
        'UPDATE surveys SET title=COALESCE($1,title),introduction=COALESCE($2,introduction),updated_at=NOW() WHERE id=$3',
        [b.title ?? null, b.introduction ?? null, req.params.id],
      );
    }
    res.json({ data: await service.detail(req.params.id) });
  } catch (e) {
    res.status(e.status || 500).json({ error: { message: e.message } });
  }
});
router.delete('/admin/:id/responses', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM survey_responses WHERE survey_id=$1', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
router.post('/admin/:id/questions', async (req, res, next) => {
  try {
    await editable(req.params.id);
    const b = req.body || {},
      qid = crypto.randomUUID();
    await pool.query(
      'INSERT INTO survey_questions(id,section_id,code,content,type,required,max_choices,scale_min,scale_max,rows,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [
        qid,
        b.sectionId,
        b.code,
        b.content,
        b.type,
        b.required !== false,
        b.maxChoices || null,
        b.scaleMin || 1,
        b.scaleMax || 5,
        JSON.stringify(b.rows || []),
        b.position || 999,
      ],
    );
    for (const [i, label] of (b.options || []).entries())
      await pool.query(
        'INSERT INTO survey_options(id,question_id,label,value,position) VALUES($1,$2,$3,$4,$5)',
        [crypto.randomUUID(), qid, label, label, i],
      );
    res.status(201).json({ data: await service.detail(req.params.id) });
  } catch (e) {
    res.status(e.status || 500).json({ error: { message: e.message } });
  }
});
router.patch('/admin/:id/questions/:questionId', async (req, res, next) => {
  try {
    await editable(req.params.id);
    const b = req.body || {};
    await pool.query(
      'UPDATE survey_questions SET section_id=COALESCE($1,section_id),code=COALESCE($2,code),content=COALESCE($3,content),type=COALESCE($4,type),required=COALESCE($5,required),max_choices=$6,position=COALESCE($7,position),rows=COALESCE($8,rows) WHERE id=$9',
      [
        b.sectionId ?? null,
        b.code ?? null,
        b.content ?? null,
        b.type ?? null,
        b.required ?? null,
        b.maxChoices ?? null,
        b.position ?? null,
        b.rows ? JSON.stringify(b.rows) : null,
        req.params.questionId,
      ],
    );
    if (Array.isArray(b.options)) {
      await pool.query('DELETE FROM survey_options WHERE question_id=$1', [req.params.questionId]);
      for (const [i, label] of b.options.entries())
        await pool.query(
          'INSERT INTO survey_options(id,question_id,label,value,position) VALUES($1,$2,$3,$4,$5)',
          [crypto.randomUUID(), req.params.questionId, label, label, i],
        );
    }
    res.json({ data: await service.detail(req.params.id) });
  } catch (e) {
    res.status(e.status || 500).json({ error: { message: e.message } });
  }
});
router.delete('/admin/:id/questions/:questionId', async (req, res, next) => {
  try {
    await editable(req.params.id);
    await pool.query('DELETE FROM survey_questions WHERE id=$1', [req.params.questionId]);
    res.status(204).end();
  } catch (e) {
    res.status(e.status || 500).json({ error: { message: e.message } });
  }
});
module.exports = router;
