const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  approveDoctorAccess,
  getPatientDoctorAccess,
  revokeDoctorAccess,
} = require('../controllers/doctorController');
const { getProfile, updateProfile } = require('../controllers/patientController');

const router = express.Router();

router.use(authMiddleware, authMiddleware.requireRole('patient'));
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/doctors/access', getPatientDoctorAccess);
router.post('/doctors/:doctorId/approve', approveDoctorAccess);
router.delete('/doctors/:doctorId/access', revokeDoctorAccess);

module.exports = router;
