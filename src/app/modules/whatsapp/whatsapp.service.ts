import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import PQueue from 'p-queue';
import { IWhatsAppMessagePayload, TWhatsAppStatus } from './whatsapp.interface';
import ApiError from '../../../errors/ApiErrors';
import httpStatus from 'http-status';
import config from '../../../config';
import logger from '../../../shared/logger';

class WhatsAppService {
  private client: Client;
  private status: TWhatsAppStatus = 'INITIALIZING';
  private qrCode: string | null = null;
  private onQRCallback: ((qr: string) => void) | null = null;
  private onStatusCallback: ((status: TWhatsAppStatus) => void) | null = null;
  private messageQueue: PQueue;

  constructor() {
    this.messageQueue = new PQueue({ concurrency: 1 }); // Process one message at a time to avoid session lock
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: config.whatsapp.session_path
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }
    });

    this.initializeEvents();
  }

  private initializeEvents() {
    this.client.on('qr', async (qr) => {
      this.status = 'AUTHENTICATING';
      try {
        this.qrCode = await qrcode.toDataURL(qr);
        if (this.onQRCallback) {
          this.onQRCallback(this.qrCode);
        }
        logger.info('WhatsApp QR Code generated and transmitted via Socket.IO');
      } catch (err) {
        logger.error({ err }, 'Failed to generate WhatsApp QR Code');
      }
    });

    this.client.on('ready', () => {
      this.status = 'READY';
      this.qrCode = null;
      if (this.onStatusCallback) {
        this.onStatusCallback(this.status);
      }
      logger.info('WhatsApp Client is ready and authenticated');
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp Authenticated successfully');
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'DISCONNECTED';
      logger.error('WhatsApp Auth failure: %s', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'DISCONNECTED';
      logger.warn('WhatsApp Client was logged out or disconnected: %s', reason);
      this.client.initialize().catch(err => logger.error({ err }, 'Failed to re-initialize WhatsApp client'));
    });
  }

  public initialize() {
    logger.info('Initializing WhatsApp Service...');
    this.client.initialize().catch(err => logger.error({ err }, 'WhatsApp initialization failed'));
  }

  public setOnQRCallback(callback: (qr: string) => void) {
    this.onQRCallback = callback;
    if (this.qrCode) {
      callback(this.qrCode);
    }
  }

  public setOnStatusCallback(callback: (status: TWhatsAppStatus) => void) {
    this.onStatusCallback = callback;
    callback(this.status);
  }

  public getStatus() {
    return this.status;
  }

  public getQRCode() {
    return this.qrCode;
  }

  /**
   * Sends a WhatsApp message.
   * Uses a queue to handle concurrency and ensure stability.
   */
  public async sendMessage(payload: IWhatsAppMessagePayload) {
    if (this.status !== 'READY') {
      logger.warn('Attempted to send message while WhatsApp client is not READY. Current status: %s', this.status);
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'WhatsApp client is not ready');
    }

    const { phoneNumber, message } = payload;
    
    return this.messageQueue.add(async () => {
      try {
        logger.info('Processing message for: %s', phoneNumber);
        const formattedNumber = phoneNumber.replace('+', '').replace(/[^0-9]/g, '') + '@c.us';
        const response = await this.client.sendMessage(formattedNumber, message);
        logger.info('Message successfully sent to %s (SID: %s)', phoneNumber, response.id._serialized);
        return response;
      } catch (error: any) {
        logger.error({ err: error }, `Failed to send WhatsApp message to ${phoneNumber}`);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to send WhatsApp message: ${error.message}`);
      }
    });
  }
}

export const whatsappService = new WhatsAppService();
