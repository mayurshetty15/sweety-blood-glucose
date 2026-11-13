const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getDoctorPatients,
  getDoctorPatientReport,
} = require('../controllers/doctorController');

const router = express.Router();

router.use(authMiddleware, authMiddleware.requireRole('doctor'));
router.get('/patients', getDoctorPatients);
router.get('/patients/:patientId/report', getDoctorPatientReport);

module.exports = router;
