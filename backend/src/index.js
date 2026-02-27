require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const sprintRoutes = require('./routes/sprint');
const teamRoutes = require('./routes/team');
const feedbackRoutes = require('./routes/feedback');
const githubRoutes = require('./routes/github');

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'forgesecret', resave: false, saveUninitialized: false }));

app.use(passport.initialize());
app.use(passport.session());

// Passport GitHub OAuth configuration
passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});

passport.use(new GitHubStrategy({
	clientID: process.env.GITHUB_CLIENT_ID,
	clientSecret: process.env.GITHUB_CLIENT_SECRET,
	callbackURL: process.env.GITHUB_CALLBACK_URL,
},
async (accessToken, refreshToken, profile, done) => {
	// Here you would look up or create the user in your DB
	// For MVP, just return the profile and token
	const user = {
		githubId: profile.id,
		githubUsername: profile.username,
		name: profile.displayName || profile.username,
		email: (profile.emails && profile.emails[0] && profile.emails[0].value) || '',
		githubToken: accessToken,
		technicalCredibilityScore: 80,
		executionScore: 70,
		reliabilityScore: 90,
		compositeScore: 80,
		executionVerified: true
	};
	return done(null, user);
}));


app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/sprint', sprintRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/github', githubRoutes);

app.get('/', (req, res) => res.send('Forge backend running'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
