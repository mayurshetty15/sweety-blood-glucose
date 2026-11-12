const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const healthRouter = require('./routes/health');

const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: clientUrl }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Sweety API',
  });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((error, req, res, next) => {
  console.error('Unhandled request error.');
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

module.exports = app;
