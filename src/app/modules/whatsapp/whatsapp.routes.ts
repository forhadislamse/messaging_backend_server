import express from 'express';
// import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { rateLimit } from 'express-rate-limit';
import { whatsappController } from './whatsapp.controller';
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

router.post(
  '/send-message',
  sendMsgLimiter,
  // auth(),
  validateRequest(whatsappValidation.sendMessageSchema),
  whatsappController.sendMessage,
);

router.get('/status', whatsappController.getStatus);

export const WhatsAppRoutes = router;
