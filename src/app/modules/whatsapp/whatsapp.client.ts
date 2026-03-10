import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { TWhatsAppStatus } from './whatsapp.interface';
import config from '../../../config';
import logger from '../../../shared/logger';

class WhatsAppClient {
  private client: Client;
  private status: TWhatsAppStatus = 'INITIALIZING';
  private qrCode: string | null = null;
  private onQRCallback: ((qr: string) => void) | null = null;
  private onStatusCallback: ((status: TWhatsAppStatus) => void) | null = null;

  constructor() {
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
  }

  public initialize() {
    this.client.initialize().catch(err => logger.error({ err }, 'WhatsApp initialization failed'));
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
}

export const whatsappClient = new WhatsAppClient();
