import PQueue from 'p-queue';
import { whatsappClient } from './whatsapp.client';
import { IWhatsAppMessagePayload } from './whatsapp.interface';
import ApiError from '../../../errors/ApiErrors';
import httpStatus from 'http-status';
import logger from '../../../shared/logger';

/**
 * MessageService handles generic message sending logic.
 * It uses a queue to manage concurrency and stability.
 */
class MessageService {
  private queue: PQueue;

  constructor() {
    this.queue = new PQueue({ concurrency: 1 });
  }

  public async sendWhatsAppMessage(payload: IWhatsAppMessagePayload) {
    const status = whatsappClient.getStatus();
    
    if (status !== 'READY') {
      logger.warn('Attempted to send message while WhatsApp client is %s', status);
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'WhatsApp client is not ready');
    }

    const { phoneNumber, message } = payload;
    
    return this.queue.add(async () => {
      try {
        logger.info('Sending message to: %s', phoneNumber);
        const client = whatsappClient.getClient();
        const formattedNumber = phoneNumber.replace('+', '').replace(/[^0-9]/g, '') + '@c.us';
        const response = await client.sendMessage(formattedNumber, message);
        logger.info('Message sent successfully to %s', phoneNumber);
        return response;
      } catch (error: any) {
        logger.error({ err: error }, `Failed to send message to ${phoneNumber}`);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to send WhatsApp message: ${error.message}`);
      }
    });
  }

  // Future SMS or Email methods can be added here
}

export const messageService = new MessageService();
