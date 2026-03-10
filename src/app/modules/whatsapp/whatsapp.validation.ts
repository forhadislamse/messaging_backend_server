import { z } from 'zod';

const sendMessageSchema = z.object({
  phoneNumber: z.string({
    required_error: 'Phone number is required',
  }),
  message: z.string({
    required_error: 'Message is required',
  }),
});

export const whatsappValidation = {
  sendMessageSchema,
};
