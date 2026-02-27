const express = require('express');
const router = express.Router();

// Placeholder: Get current user profile
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.user);
});

module.exports = router;
