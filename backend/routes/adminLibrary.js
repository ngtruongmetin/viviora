const express = require('express');
const { requireRole } = require('../middlewares/auth');
const { listCollections } = require('../services/libraryService');

const router = express.Router();
router.use(requireRole('ADMIN'));

router.get('/collections', async (req, res, next) => {
  try {
    res.json(await listCollections({ ...req.query, limit: req.query.limit || 30 }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
