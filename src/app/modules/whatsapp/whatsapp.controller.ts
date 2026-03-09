import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { whatsappService } from './whatsapp.service';

const sendMessage = catchAsync(async (req, res) => {
  const result = await whatsappService.sendMessage(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message sent successfully',
    data: result,
  });
});

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

export const whatsappController = {
  sendMessage,
  getStatus,
};
