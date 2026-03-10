import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { whatsappService } from './whatsapp.service';

const getStatus = catchAsync(async (req, res) => {
  const status = whatsappService.getStatus();
  const qrCode = whatsappService.getQRCode();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'WhatsApp status retrieved successfully',
    data: { status, qrCode },
  });
});

const logout = catchAsync(async (req, res) => {
  await whatsappService.logout();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'WhatsApp session cleared successfully. A new QR code will be generated shortly.',
  });
});

const getChats = catchAsync(async (req, res) => {
  const result = await whatsappService.getChats();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'WhatsApp chats fetched successfully',
    data: result,
  });
});

const getChatMessages = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const { limit } = req.query;
  const result = await whatsappService.getChatMessages(chatId, limit ? Number(limit) : undefined);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Chat messages fetched successfully',
    data: result,
  });
});

export const authController = {
  getStatus,
  logout,
  getChats,
  getChatMessages,
};
