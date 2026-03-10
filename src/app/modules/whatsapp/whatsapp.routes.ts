import express from 'express';
// import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { rateLimit } from 'express-rate-limit';
import { authController } from './auth.controller';
import { messageController } from './message.controller';
import { whatsappValidation } from './whatsapp.validation';

const router = express.Router();

const sendMsgLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  message: {
    success: false,
    message: "Too many messages sent. Please wait a minute.",
  }
});

// Authentication Routes
router.get('/status', authController.getStatus);
router.get('/chats', authController.getChats);
router.post('/logout', authController.logout);

// Messaging Routes
router.post(
  '/send-message',
  sendMsgLimiter,
  // auth(),
  validateRequest(whatsappValidation.sendMessageSchema),
  messageController.sendMessage,
);

export const WhatsAppRoutes = router;
