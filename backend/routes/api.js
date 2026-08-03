const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const downloadController = require('../controllers/downloadController');
const { getSystemStatus } = require('../utils/systemStatus');
const { getLibrary, deleteFile, renameFile } = require('../controllers/libraryController');

// Middleware to verify JWT
const verifyToken = require('../middleware/authMiddleware');

// Auth routes
router.post('/auth/login', authController.login);
router.get('/auth/verify', verifyToken, authController.verify);

// System Status
router.get('/system-status', verifyToken, async (req, res) => {
  try {
    const status = await getSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

// Download routes
router.post('/downloads/start', verifyToken, downloadController.startDownload);
router.get('/downloads/queue', verifyToken, downloadController.getQueue);

// Library routes
router.get('/library', verifyToken, getLibrary);
router.delete('/library/:filename', verifyToken, deleteFile);
router.put('/library/:filename', verifyToken, renameFile);

module.exports = router;
