const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getDoctors } = require('../controllers/doctorController');

const router = express.Router();

router.use(authMiddleware, authMiddleware.requireRole('patient'));
router.get('/', getDoctors);

module.exports = router;
