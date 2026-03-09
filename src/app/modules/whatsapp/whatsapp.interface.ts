export interface IWhatsAppMessagePayload {
  phoneNumber: string;
  message: string;
}

export type TWhatsAppStatus = 'INITIALIZING' | 'AUTHENTICATING' | 'READY' | 'DISCONNECTED';
