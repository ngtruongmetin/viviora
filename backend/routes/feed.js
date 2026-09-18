const express = require('express');
const { listPosts } = require('../services/communityService');

const router = express.Router();
router.get('/', async (req, res, next) => {
  try {
    res.json(await listPosts({ viewerId: req.session.user?.id || null, cursor: req.query.cursor || null, limit: req.query.limit }));
  } catch (error) { next(error); }
});
module.exports = router;
