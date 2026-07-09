const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const chatRoutes = require('./routes/chat');
const assessmentRoutes = require('./routes/assessment');
const contentRoutes = require('./routes/content');
const bookingRoutes = require('./routes/booking');
const adminRoutes = require('./routes/admin');

// Import auth service and middleware
const { AuthService } = require('./services/auth');
const { authenticate, optionalAuth } = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth endpoints
app.post('/auth/signup', async (req, res) => {
  try {
    const { username, email, password, first_name, last_name } = req.body;
    const result = await AuthService.signUp(username, email, password, { first_name, last_name });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/confirm-signup', async (req, res) => {
  try {
    const { username, confirmation_code } = req.body;
    const result = await AuthService.confirmSignUp(username, confirmation_code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await AuthService.signIn(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const result = await AuthService.refreshToken(refresh_token);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/auth/signout', authenticate, async (req, res) => {
  try {
    const { access_token } = req.body;
    await AuthService.signOut(access_token);
    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/auth/user', authenticate, async (req, res) => {
  try {
    const user_info = await AuthService.getUserInfo(req.headers.authorization.split(' ')[1]);
    res.json({ user: user_info });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/auth/change-password', authenticate, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const access_token = req.headers.authorization.split(' ')[1];
    await AuthService.changePassword(access_token, old_password, new_password);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;
    await AuthService.forgotPassword(username);
    res.json({ message: 'Password reset code sent' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/confirm-forgot-password', async (req, res) => {
  try {
    const { username, confirmation_code, new_password } = req.body;
    await AuthService.confirmForgotPassword(username, confirmation_code, new_password);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API routes
app.use('/api/chat', chatRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request entity too large' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Health check available at http://localhost:${port}/health`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;