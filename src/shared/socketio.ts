import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { whatsappService } from '../app/modules/whatsapp/whatsapp.service';

let io: SocketIOServer;

export const setupSocketIO = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('New Socket.IO client connected:', socket.id);

    // Send current status and QR code if available
    socket.emit('whatsapp_status', whatsappService.getStatus());
    const qr = whatsappService.getQRCode();
    if (qr) {
      socket.emit('whatsapp_qr', qr);
    }

    socket.on('disconnect', () => {
      console.log('Socket.IO client disconnected:', socket.id);
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

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};
