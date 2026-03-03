const express = require('express');
const router = express.Router();
const { analyzeGap } = require('../controllers/analyzeGap');

router.post('/analyze', analyzeGap);

module.exports = router;