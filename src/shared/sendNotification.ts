import prisma from "./prisma";
// import { NotificationType } from "@prisma/client";

type NotificationPayload = {
  userId: string;
  title: string;
  body: string;
  type: any;
  targetId?: string;
  slug?: string;
  fcmToken?: string;
};

export const sendNotification = async (payload: NotificationPayload) => {
  const { userId, title, body, type, targetId, slug, fcmToken } = payload;

  // Create notification in database
  /* const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      type,
      targetId,
      slug,
      fcmToken,
    },
  }); */

  console.log(`Notification attempt to ${userId}: ${title} - ${body}`);
  return { id: "mock-id", ...payload };
};
