const express = require('express');
const passport = require('passport');
const router = express.Router();

// GitHub OAuth login
router.get('/github', passport.authenticate('github', { scope: ['user:email', 'repo'] }));

// GitHub OAuth callback
router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
  res.redirect('http://localhost:3000/dashboard');
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;
