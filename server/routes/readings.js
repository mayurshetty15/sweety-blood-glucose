const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createReading,
  deleteReading,
  getReadingById,
  getReadings,
  updateReading,
} = require('../controllers/readingController');

const router = express.Router();

router.use(authMiddleware, authMiddleware.requireRole('patient'));

router.post('/', createReading);
router.get('/', getReadings);
router.get('/:id', getReadingById);
router.put('/:id', updateReading);
router.delete('/:id', deleteReading);

module.exports = router;
