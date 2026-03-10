import { whatsappClient } from './whatsapp.client'; 
import { TWhatsAppStatus } from './whatsapp.interface';

/**
 * WhatsAppService handles high-level state coordination
 * and reporting for the WhatsApp channel.
 * Delegates low-level details to WhatsAppClient.
 */
class WhatsAppService {
  public initialize() {
    whatsappClient.initialize();
  }

  public getStatus() {
    return whatsappClient.getStatus();
  }

  public getQRCode() {
    return whatsappClient.getQRCode();
  }

  public setOnQRCallback(callback: (qr: string) => void) {
    whatsappClient.setOnQRCallback(callback);
    // Immediately trigger if QR exists
    const currentQR = whatsappClient.getQRCode();
    if (currentQR) callback(currentQR);
  }

  public setOnStatusCallback(callback: (status: TWhatsAppStatus) => void) {
    whatsappClient.setOnStatusCallback(callback);
    // Immediately trigger with current status
    callback(whatsappClient.getStatus());
  }

  public setOnMessageCallback(callback: (message: any) => void) {
    whatsappClient.setOnMessageCallback(callback);
  }

  public async logout() {
    await whatsappClient.logout();
  }
}

export const whatsappService = new WhatsAppService();