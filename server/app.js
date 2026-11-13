const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const doctorRouter = require('./routes/doctor');
const doctorsRouter = require('./routes/doctors');
const healthRouter = require('./routes/health');
const patientRouter = require('./routes/patient');
const readingsRouter = require('./routes/readings');

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
app.use('/api/doctor', doctorRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/patient', patientRouter);
app.use('/api/readings', readingsRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((error, req, res, next) => {
  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'A valid JSON request body is required.',
    });
  }

  console.error('Unhandled request error.');
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

module.exports = app;
