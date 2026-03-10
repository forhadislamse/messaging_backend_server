import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from '../../../shared/catchAsync';
import { messageService } from './message.service';

const sendMessage = catchAsync(async (req, res) => {
  const result = await messageService.sendWhatsAppMessage(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message sent successfully',
    data: result,
  });
});

export const messageController = {
  sendMessage,
};
