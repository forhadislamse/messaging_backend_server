import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import { messageService } from './message.service';

const sendMessage = catchAsync(async (req, res) => {
  const result = await messageService.sendWhatsAppMessage(req.body);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Message sent successfully',
    data: result,
  });
});

export const messageController = {
  sendMessage,
};
