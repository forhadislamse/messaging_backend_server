import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { whatsappService } from '../app/modules/whatsapp/whatsapp.service';
import logger from './logger';

let io: SocketIOServer;

export const setupSocketIO = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info('New Socket.IO client connected: %s', socket.id);

    // Send current status and QR code if available
    socket.emit('whatsapp_status', whatsappService.getStatus());
    const qr = whatsappService.getQRCode();
    if (qr) {
      socket.emit('whatsapp_qr', qr);
    }

    // Listens for message sending from client
    socket.on('send_message', async (payload: { phoneNumber: string, message: string }) => {
      try {
        const { messageService } = await import('../app/modules/whatsapp/message.service');
        await messageService.sendWhatsAppMessage(payload);
        logger.info('Message sent via Socket.IO from %s', socket.id);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      logger.info('Socket.IO client disconnected: %s', socket.id);
    });
  });

  // Link WhatsApp service callbacks to Socket.IO
  whatsappService.setOnQRCallback((qr) => {
    if (io) {
      io.emit('whatsapp_qr', qr);
    }
  });

  whatsappService.setOnStatusCallback((status) => {
    if (io) {
      io.emit('whatsapp_status', status);
    }
  });

  whatsappService.setOnMessageCallback((message) => {
    if (io) {
      io.emit('whatsapp_message_received', {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp,
        type: message.type,
        fromMe: message.fromMe,
      });
    }
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};
