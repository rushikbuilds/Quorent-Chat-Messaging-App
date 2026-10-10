const express = require('express');
const router = express.Router();
const uploadController = require('../controller/upload.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');

router.post('/profile-pic', verifyToken, uploadController.uploadProfilePic);
router.post('/group-image', verifyToken, uploadController.uploadGroupImage);
router.post('/attachment', verifyToken, uploadController.uploadAttachment);
router.get('/profiles/:filename', uploadController.getProfilePicture);
router.get('/chat-images/:filename', verifyToken, uploadController.getChatImage);
router.get('/attachments/:filename', verifyToken, uploadController.getAttachment);
router.get('/presigned/:filename', optionalAuth, uploadController.getPresignedUrl);
router.get('/:filename', optionalAuth, uploadController.getFile);

module.exports = router;
