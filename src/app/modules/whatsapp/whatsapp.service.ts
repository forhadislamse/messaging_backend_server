import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { IWhatsAppMessagePayload, TWhatsAppStatus } from './whatsapp.interface';
import ApiError from '../../../errors/ApiErrors';
import httpStatus from 'http-status';
import config from '../../../config';

class WhatsAppService {
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
      this.qrCode = await qrcode.toDataURL(qr);
      if (this.onQRCallback) {
        this.onQRCallback(this.qrCode);
      }
      console.log('WhatsApp QR Code generated');
    });

    this.client.on('ready', () => {
      this.status = 'READY';
      this.qrCode = null;
      if (this.onStatusCallback) {
        this.onStatusCallback(this.status);
      }
      console.log('WhatsApp Client is ready!');
    });

    this.client.on('authenticated', () => {
      console.log('WhatsApp Authenticated successfully');
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'DISCONNECTED';
      console.error('WhatsApp Auth failure:', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'DISCONNECTED';
      console.log('WhatsApp Client was logged out:', reason);
      this.client.initialize(); // Attempt reconnection
    });
  }

  public initialize() {
    this.client.initialize();
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

  public async sendMessage(payload: IWhatsAppMessagePayload) {
    if (this.status !== 'READY') {
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'WhatsApp client is not ready');
    }

    try {
      const { phoneNumber, message } = payload;
      // Format phone number: remove '+' and ensure it ends with @c.us
      const formattedNumber = phoneNumber.replace('+', '') + '@c.us';
      const response = await this.client.sendMessage(formattedNumber, message);
      return response;
    } catch (error) {
           console.log(error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send WhatsApp message');
    }
  }
}

export const whatsappService = new WhatsAppService();
