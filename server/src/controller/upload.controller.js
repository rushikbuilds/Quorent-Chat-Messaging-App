const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadProfile, uploadGroup, uploadFiles } = require('../config/upload');
const { isS3Enabled, getPresignedDownloadUrl } = require('../services/s3.service');
const Chat = require('../models/mongo/Chat');
const Message = require('../models/mongo/Message');

/**
 * Helper to serve a file from local disk (development) or redirect to an S3 presigned URL (production)
 */
const serveOrRedirectFile = async (req, res, filename) => {
  if (isS3Enabled()) {
    try {
      const presignedUrl = await getPresignedDownloadUrl(`uploads/${filename}`);
      if (req.query.json === 'true' || req.headers.accept === 'application/json') {
        return res.json({ success: true, url: presignedUrl, filename });
      }
      return res.redirect(presignedUrl);
    } catch (err) {
      console.error('[upload.serveOrRedirectFile] S3 Presigned URL error:', err);
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }
  }

  // Development mode: serve from local disk
  const filePath = path.join(__dirname, '../../uploads', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  return res.sendFile(filePath);
};

exports.uploadProfilePic = [
  uploadProfile.single('profile_pic'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filename = req.file.key ? path.basename(req.file.key) : req.file.filename;
      const fileUrl = `/uploads/${filename}`;

      await prisma.user.update({
        where: { user_id: req.user.user_id },
        data: { profile_pic: fileUrl }
      });

      res.status(200).json({
        message: 'Profile picture uploaded successfully',
        file_url: fileUrl,
        filename: filename
      });
    } catch (error) {
      console.error('[upload.uploadProfilePic]', error);
      res.status(500).json({ error: 'Error uploading profile picture' });
    }
  }
];

exports.uploadGroupImage = [
  uploadGroup.single('chat_image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filename = req.file.key ? path.basename(req.file.key) : req.file.filename;
      const fileUrl = `/uploads/${filename}`;
      const { chatId } = req.body;

      if (chatId) {
        const chat = await Chat.findByChatId(chatId);
        if (chat) {
          chat.chat_image = fileUrl;
          await chat.save();
        }
      }

      res.status(200).json({
        message: 'Group image uploaded successfully',
        file_url: fileUrl,
        filename: filename
      });
    } catch (error) {
      console.error('[upload.uploadGroupImage]', error);
      res.status(500).json({ error: 'Error uploading group image' });
    }
  }
];

exports.uploadAttachment = [
  uploadFiles.single('attachment'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filename = req.file.key ? path.basename(req.file.key) : req.file.filename;
      const fileUrl = `/uploads/${filename}`;

      res.status(200).json({
        message: 'Attachment uploaded successfully',
        file_url: fileUrl,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        filename: filename
      });
    } catch (error) {
      console.error('[upload.uploadAttachment]', error);
      res.status(500).json({ error: 'Error uploading attachment' });
    }
  }
];

exports.getChatImage = async (req, res) => {
  try {
    const filename = req.params.filename;

    const chat = await Chat.findOne({
      chat_image: { $regex: filename }
    });

    if (!chat) return res.status(404).json({ error: 'Chat image not found' });
    const isMember = chat.members.some(m => m.user_id === req.user?.user_id);
    if (!isMember) return res.status(403).json({ error: 'Access denied. You are not a member of this chat.' });

    return serveOrRedirectFile(req, res, filename);
  } catch (error) {
    console.error('[upload.getChatImage]', error);
    res.status(500).json({ error: 'Error serving file' });
  }
};

exports.getAttachment = async (req, res) => {
  try {
    const filename = req.params.filename;

    const message = await Message.findOne({
      "attachments.file_url": { $regex: filename }
    });

    if (!message) return res.status(404).json({ error: 'File not found in any accessible conversation' });

    const chat = await Chat.findByChatId(message.chat_id);
    if (!chat || !chat.members.some(m => m.user_id === req.user?.user_id)) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this conversation.' });
    }

    return serveOrRedirectFile(req, res, filename);
  } catch (error) {
    console.error('[upload.getAttachment]', error);
    res.status(500).json({ error: 'Error serving file' });
  }
};

exports.getProfilePicture = async (req, res) => {
  try {
    const filename = req.params.filename;
    return serveOrRedirectFile(req, res, filename);
  } catch (error) {
    console.error('[upload.getProfilePicture]', error);
    res.status(500).json({ error: 'Error serving file' });
  }
};

exports.getFile = async (req, res) => {
  try {
    const filename = req.params.filename;

    const userWithProfilePic = await prisma.user.findFirst({
      where: {
        OR: [
          { profile_pic: `/uploads/${filename}` },
          { profile_pic: `uploads/${filename}` },
          { profile_pic: filename },
          { profile_pic: { contains: filename } }
        ]
      }
    });
    if (userWithProfilePic) return serveOrRedirectFile(req, res, filename);

    const chatWithImage = await Chat.findOne({
      chat_image: { $regex: filename }
    });
    if (chatWithImage) return serveOrRedirectFile(req, res, filename);

    const message = await Message.findOne({
      "attachments.file_url": { $regex: filename }
    });
    if (message) {
      if (req.user) {
        const chat = await Chat.findByChatId(message.chat_id);
        if (chat && chat.members.some(m => m.user_id === req.user.user_id)) {
          return serveOrRedirectFile(req, res, filename);
        }
      } else {
        return serveOrRedirectFile(req, res, filename);
      }
    }

    // Default fallback to serve if file exists
    return serveOrRedirectFile(req, res, filename);
  } catch (error) {
    console.error('[upload.getFile]', error);
    res.status(500).json({ error: 'Error serving file' });
  }
};

exports.getPresignedUrl = async (req, res) => {
  try {
    const filename = req.params.filename;
    if (isS3Enabled()) {
      const url = await getPresignedDownloadUrl(`uploads/${filename}`);
      return res.json({ success: true, url, filename });
    }
    const baseUrl = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/+$/, '');
    return res.json({ success: true, url: `${baseUrl}/uploads/${filename}`, filename });
  } catch (error) {
    console.error('[upload.getPresignedUrl]', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
};
