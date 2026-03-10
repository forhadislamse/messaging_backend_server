import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import PQueue from 'p-queue';
import { TWhatsAppStatus } from './whatsapp.interface';
import config from '../../../config';
import logger from '../../../shared/logger';

class WhatsAppClient {
  private client: Client;
  private status: TWhatsAppStatus = 'INITIALIZING';
  private qrCode: string | null = null;
  private onQRCallback: ((qr: string) => void) | null = null;
  private onStatusCallback: ((status: TWhatsAppStatus) => void) | null = null;
  private onMessageCallback: ((message: any) => void) | null = null;
  private messageQueue: PQueue;

  constructor() {
    this.messageQueue = new PQueue({ concurrency: 1 });
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: config.whatsapp.session_path
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-extensions',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
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
        logger.info('WhatsApp QR Code generated');
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
      logger.info('WhatsApp Client is ready');
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp Authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'DISCONNECTED';
      logger.error('WhatsApp Auth failure: %s', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'DISCONNECTED';
      logger.warn('WhatsApp Client disconnected: %s', reason);
      this.client.initialize().catch(err => logger.error({ err }, 'Failed to re-initialize WhatsApp client'));
    });

    this.client.on('message_create', (message) => {
      // message_create triggers for both incoming and outgoing messages
      const isOutgoing = message.fromMe;
      logger.info('WhatsApp message %s: %s', isOutgoing ? 'sent' : 'received', message.from);
      
      if (this.onMessageCallback) {
        this.onMessageCallback(message);
      }
    });
  }

  public initialize() {
    this.client.initialize().catch(err => logger.error({ err }, 'WhatsApp initialization failed'));
  }

  public async logout() {
    try {
      logger.info('Logging out of WhatsApp...');
      await this.client.logout();
      this.status = 'DISCONNECTED';
      this.qrCode = null;
      logger.info('WhatsApp logout successful');
      
      // Re-initialize to get a fresh QR code
      setTimeout(() => {
        this.initialize();
      }, 2000);
    } catch (err) {
      logger.error({ err }, 'WhatsApp logout failed');
      throw err;
    }
  }

  public getClient() {
    return this.client;
  }

  public getStatus() {
    return this.status;
  }

  public getQRCode() {
    return this.qrCode;
  }

  public setOnQRCallback(callback: (qr: string) => void) {
    this.onQRCallback = callback;
  }

  public setOnStatusCallback(callback: (status: TWhatsAppStatus) => void) {
    this.onStatusCallback = callback;
  }

  public setOnMessageCallback(callback: (message: any) => void) {
    this.onMessageCallback = callback;
  }
}

export const whatsappClient = new WhatsAppClient();
