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
        let formattedNumber = phoneNumber.trim();
        
        // If it doesn't already have a suffix (@c.us or @g.us), format it as a private number
        if (!formattedNumber.includes('@')) {
          formattedNumber = formattedNumber.replace('+', '').replace(/[^0-9]/g, '') + '@c.us';
        }

        const client = whatsappClient.getClient();
        
        // Validate if the number is registered/valid on WhatsApp
        // getNumberId returns the official ID (e.g. 88017x@c.us) or null if not found
        const numberId = await client.getNumberId(formattedNumber);
        
        if (!numberId) {
          logger.warn('Destination number %s is not registered on WhatsApp', formattedNumber);
          throw new ApiError(httpStatus.BAD_REQUEST, `The number ${phoneNumber} is not registered on WhatsApp or invalid.`);
        }

        const finalDestination = numberId._serialized;
        if (finalDestination !== formattedNumber) {
          logger.info('Number %s resolved to official ID: %s', formattedNumber, finalDestination);
        }
        
        logger.info('Sending message to verified destination: %s', finalDestination);

        const response = await client.sendMessage(finalDestination, message);
        logger.info('Message sent successfully to %s', finalDestination);
        return response;
      } catch (error: any) {
        logger.error({ err: error, phoneNumber }, `Failed to send message to ${phoneNumber}`);
        
        // If it's already an ApiError (from our check), rethrow it
        if (error instanceof ApiError) throw error;

        const errorMessage = error.message || 'Unknown error';
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `WhatsApp Error: ${errorMessage}`);
      }
    });
  }

  // Future SMS or Email methods can be added here
}

export const messageService = new MessageService();
