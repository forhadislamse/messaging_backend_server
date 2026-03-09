import express from 'express';
// import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { whatsappController } from './whatsapp.controller';
import { whatsappValidation } from './whatsapp.validation';

const router = express.Router();

router.post(
  '/send-message',
  // auth(),
  validateRequest(whatsappValidation.sendMessageSchema),
  whatsappController.sendMessage,
);

router.get('/status', whatsappController.getStatus);

export const WhatsAppRoutes = router;
