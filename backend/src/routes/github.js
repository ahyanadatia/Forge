const express = require('express');
const router = express.Router();
const githubController = require('../controllers/github');

// Analyze GitHub data for current user
router.get('/analyze', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const result = await githubController.analyzeUser(req.user.githubToken);
  res.json(result);
});

module.exports = router;
