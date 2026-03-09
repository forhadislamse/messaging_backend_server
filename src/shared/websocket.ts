import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
// import { NotificationType, UserRole } from "@prisma/client";
import { jwtHelpers } from "../helpars/jwtHelpers";
import config from "../config";
import prisma from "./prisma";
// import { notificationService } from "../app/modules/Notification/Notification.service";

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  userName?: string;
  isAlive?: boolean;
  path?: string;
}

export const onlineUsers = new Map<
  string,
  { socket: ExtendedWebSocket; path: string }
>();
export const userSockets = new Map<string, ExtendedWebSocket>();
const roomSockets = new Map<string, Set<string>>();

function send(ws: ExtendedWebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function sendToUser(userId: string, payload: unknown) {
  const conn = onlineUsers.get(userId);
  if (conn?.socket.readyState === WebSocket.OPEN) {
    conn.socket.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

function broadcastToAll(wss: WebSocketServer, payload: object) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN)
      client.send(JSON.stringify(payload));
  });
}

// =============================
// WebSocket Server
// =============================
export function setupChatWebSocket(server: Server, path = "/ws/chat") {
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });

  server.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith(path)) {
      wss.handleUpgrade(request, socket, head, (ws) =>
        wss.emit("connection", ws, request)
      );
    }
  });

  const heartbeat = (ws: ExtendedWebSocket) => (ws.isAlive = true);
  const interval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) {
        if (ws.userId) {
          onlineUsers.delete(ws.userId);
          userSockets.delete(ws.userId);
        }
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  wss.on("close", () => clearInterval(interval));

  wss.on("connection", (ws: ExtendedWebSocket, req) => {
    ws.isAlive = true;
    ws.path = req.url;
    send(ws, { event: "info", message: "Connected. Please authenticate." });
    ws.on("pong", () => heartbeat(ws));

    ws.on("message", async (raw: string) => {
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return send(ws, { event: "error", message: "Invalid JSON" });
      }
      const { event } = parsed || {};

      if (!ws.userId && event !== "authenticate")
        return send(ws, { event: "error", message: "Authenticate first" });

      try {
        switch (event) {
          // =========================
          case "authenticate": {
            const token = parsed.token;
            if (!token)
              return send(ws, { event: "error", message: "Token required" });
            try {
              const user = jwtHelpers.verifyToken(
                token,
                config.jwt!.jwt_secret!
              ) as { id: string; role: any; email: string };
              const existing = onlineUsers.get(user.id);
              if (existing && existing.path === ws.path) {
                existing.socket.close();
                onlineUsers.delete(user.id);
              }
              ws.userId = user.id;
              ws.userRole = user.role;
              ws.userName = user.email;
              onlineUsers.set(user.id, { socket: ws, path: ws.path || "/" });
              userSockets.set(user.id, ws);
              send(ws, {
                event: "authenticated",
                data: { userId: user.id, role: user.role },
              });
              broadcastToAll(wss, {
                event: "userStatus",
                data: { userId: user.id, isOnline: true },
              });
            } catch {
              send(ws, { event: "error", message: "Invalid token" });
            }
            break;
          }

          // =========================
          /*     case "message": {
            const { receiverId, message, itemId, images } = parsed;
            if (!ws.userId || !receiverId ) return;

            // Find existing room or create new one (item-specific)
            let room = await prisma.room.findFirst({
              where: {
                senderId: ws.userId,
                receiverId,
                itemId,
          
              },
            });

            if (!room) {
              room = await prisma.room.create({
                data: { senderId: ws.userId, receiverId, itemId }
              });
            }

            const chat = await prisma.chat.create({
  data: { 
    senderId: ws.userId,
    receiverId,
    roomId: room.id,
    message,
    images: images || []       // ← IMPORTANT
  }
});

            const users = await prisma.user.findMany({
              where: { id: { in: [ws.userId, receiverId] } },
              select: { id: true, firstName: true, lastName: true, profileImage: true }
            });

            const enrichedChat = {
              ...chat,
              sender: users.find(u => u.id === ws.userId),
              receiver: users.find(u => u.id === receiverId)
            };

            const receiverSocket = userSockets.get(receiverId);
            if (receiverSocket) send(receiverSocket, { event: "message", data: enrichedChat });
            send(ws, { event: "message", data: enrichedChat });
            break;
          } */

          case "message": {
            const { receiverId, message, itemId, images, fcmToken } = parsed;
            if (!ws.userId || !receiverId) return;

            // --- TEMP: save receiver's FCM token if provided
            if (fcmToken) {
              await prisma.user.update({
                where: { id: receiverId },
                data: { fcmToken },
              });
            }

            // Room and Chat models are MISSING in schema.prisma
            /* let room = await prisma.room.findFirst({
              where: {
                senderId: ws.userId,
                receiverId,
                itemId,
              },
            });

            if (!room) {
              room = await prisma.room.create({
                data: { senderId: ws.userId, receiverId, itemId },
              });
            }

            const chat = await prisma.chat.create({
              data: {
                senderId: ws.userId,
                receiverId,
                roomId: room.id,
                message,
                images: images || [],
              },
            });

            const users = await prisma.user.findMany({
              where: { id: { in: [ws.userId, receiverId] } },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
                fcmToken: true,
              },
            });

            const enrichedChat = {
              ...chat,
              itemId: room.itemId,
              sender: users.find((u) => u.id === ws.userId),
              receiver: users.find((u) => u.id === receiverId),
            };

            const receiverSocket = userSockets.get(receiverId);
            if (receiverSocket)
              send(receiverSocket, { event: "message", data: enrichedChat });
            send(ws, { event: "message", data: enrichedChat }); */

            send(ws, { event: "error", message: "Chat service currently unavailable" });
            break;
          }

          // -------------------------------
          // 🔹 Send Notification to Receiver
          // -------------------------------
          /* try {
            const receiver = users.find((u) => u.id === receiverId);
            const sender = users.find((u) => u.id === ws.userId);

            if (receiver?.fcmToken) {
              const payload = {
                title: "New Message",
                body: `${sender?.firstName} sent you a message`,
                type: (NotificationType as any).NEW_CHAT_MESSAGE,
                targetId: receiverId,
                slug: "new-chat-message",
                fcmToken: receiver.fcmToken,
                data: JSON.stringify({ chatId: chat.id, roomId: room.id }),
              };

              await (notificationService as any).sendNotification(
                receiver.fcmToken,
                payload,
                receiverId
              );
              await (notificationService as any).saveNotification(payload, receiverId);
            }
          } catch (err) {
            console.error("Failed to send chat notification:", err);
          } */

          // The `break` here was for the commented-out notification logic.
          // Since the entire `message` case now ends with `send(...)` and `break`,
          // this extra `break` is redundant and potentially misplaced.
          // Removing it to ensure correct flow.
          // break;
          // =========================

          /* case "fetchChats": {
            const { receiverId, itemId } = parsed;
            if (!ws.userId) return;

            // Find all rooms between the two users for this item
            const rooms = await prisma.room.findMany({
              where: {
                OR: [
                  { senderId: ws.userId, receiverId, ...(itemId && { itemId }) },
                  { senderId: receiverId, receiverId: ws.userId, ...(itemId && { itemId }) },
                ],
              },
              select: { id: true },
            });

            if (!rooms.length) return send(ws, { event: "fetchChats", data: [] });

            const roomIds = rooms.map(r => r.id);

            // Fetch all chats in these rooms
            const chats = await prisma.chat.findMany({
              where: { roomId: { in: roomIds } },
              orderBy: { createdAt: "asc" },
            });

            if (!chats.length) return send(ws, { event: "fetchChats", data: [] });

            // Mark all receiver's messages as read
            await prisma.chat.updateMany({
              where: { roomId: { in: roomIds }, receiverId: ws.userId },
              data: { isRead: true },
            });

            // Fetch full info of all users involved
            const userIds = Array.from(new Set(chats.flatMap((c: { senderId: string; receiverId: string; }) => [c.senderId, c.receiverId]))).filter(
              (id): id is string => !!id
            );
            const users = await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, firstName: true, lastName: true, profileImage: true },
            });

            // Map chats with full sender and receiver info
            const chatsWithUserInfo = chats.map((chat: { senderId: string; receiverId: string; }) => {
              const senderInfo = users.find(u => u.id === chat.senderId);
              const receiverInfo = users.find(u => u.id === chat.receiverId);

              return {
                ...chat,
                sender: senderInfo || { id: chat.senderId, firstName: "", lastName: "", profileImage: "" },
                receiver: receiverInfo || { id: chat.receiverId, firstName: "", lastName: "", profileImage: "" },
              };
            });

            send(ws, { event: "fetchChats", data: chatsWithUserInfo });
            break;
          } */


          /* case "fetchChats": {
            const { receiverId, itemId } = parsed;
            if (!ws.userId) return;
          
            // 1️⃣ Fetch all rooms between the two users for this item
            const rooms = await prisma.room.findMany({
              where: {
                itemId,
                OR: [
                  { senderId: ws.userId, receiverId },
                  { senderId: receiverId, receiverId: ws.userId },
                ],
              },
            });
          
            if (rooms.length === 0) return send(ws, { event: "fetchChats", data: [] });
          
            // 2️⃣ Fetch chats from all rooms
            const roomIds = rooms.map((r) => r.id);
            const chats = await prisma.chat.findMany({
              where: { roomId: { in: roomIds } },
              orderBy: { createdAt: "asc" },
            });
          
            // 3️⃣ Mark receiver's messages as read
            await prisma.chat.updateMany({
              where: { roomId: { in: roomIds }, receiverId: ws.userId },
              data: { isRead: true },
            });
          
            // 4️⃣ Fetch user info
            const users = await prisma.user.findMany({
              where: { id: { in: [ws.userId, receiverId] } },
              select: { id: true, firstName: true, lastName: true, profileImage: true },
            });
          
            // 5️⃣ Map chats with user info
            const chatsWithUserInfo = chats.map((chat) => ({
              ...chat,
              sender: users.find((u) => u.id === chat.senderId) || { id: chat.senderId },
              receiver: users.find((u) => u.id === chat.receiverId) || { id: chat.receiverId },
            }));
          
            // 6️⃣ Send all chats to client
            send(ws, { event: "fetchChats", data: chatsWithUserInfo });
            break;
          } */





          // =========================
          /* case "messageList": {
            const rooms = await prisma.room.findMany({
              where: { OR: [{ senderId: ws.userId }, { receiverId: ws.userId }] },
              include: { chat: { orderBy: { createdAt: "desc" }, take: 1 } }
            });

            const userIds = rooms.map(r => r.senderId === ws.userId ? r.receiverId : r.senderId).filter(id => !!id) as string[];
            const userInfos = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, profileImage: true } });

            send(ws, {
              event: "messageList",
              data: rooms.map(room => {
                const otherId = room.senderId === ws.userId ? room.receiverId : room.senderId;
                const userInfo = userInfos.find(u => u.id === otherId);
                return {
                  user: { id: otherId, username: `${userInfo?.firstName} ${userInfo?.lastName}`, profileImage: userInfo?.profileImage },
                  lastMessage: room.chat[0] || null
                };
              })
            });
            break;
          } */
          /* case "messageList": {
            const rooms = await prisma.room.findMany({
              where: {
                OR: [{ senderId: ws.userId }, { receiverId: ws.userId }],
              },
              include: { chat: { orderBy: { createdAt: "desc" }, take: 1 } },
            });

            const userIds = rooms
              .map((r) =>
                r.senderId === ws.userId ? r.receiverId : r.senderId
              )
              .filter((id) => !!id) as string[];
            const userInfos = await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            });

            const latestMessagesMap = new Map<string, any>();

            rooms.forEach((room) => {
              const otherId =
                room.senderId === ws.userId ? room.receiverId : room.senderId;
              const lastMsg = room.chat[0];
              if (!otherId || !lastMsg) return;

              const existing = latestMessagesMap.get(otherId);
              if (
                !existing ||
                existing.lastMessage.createdAt < lastMsg.createdAt
              ) {
                latestMessagesMap.set(otherId, {
                  roomId: room.id, // ✅ optional but useful
                  itemId: room.itemId, // ✅ ADD THIS
                  user: {
                    id: otherId,
                    username: `${userInfos.find((u) => u.id === otherId)?.firstName || ""
                      } ${userInfos.find((u) => u.id === otherId)?.lastName || ""
                      }`,
                    profileImage:
                      userInfos.find((u) => u.id === otherId)?.profileImage ||
                      "",
                  },
                  // lastMessage: lastMsg,
                  lastMessage: {
                    ...lastMsg,
                    itemId: room.itemId, // ✅ HERE
                    roomId: room.id, // (optional but useful)
                  },
                });
              }
            });

            send(ws, {
              event: "messageList",
              data: Array.from(latestMessagesMap.values()),
            });
            break;
          } */

          // =========================
          case "onlineUsers": {
            const users = await prisma.user.findMany({
              where: { id: { in: Array.from(userSockets.keys()) } },
              select: { id: true, email: true },
            });
            send(ws, { event: "onlineUsers", data: users });
            break;
          }

          // =========================
          /* case "unReadMessages": {
            ... (commented out due to missing Room/Chat models)
          } */

          default:
            send(ws, { event: "error", message: "Unknown event" });
        }
      } catch (err) {
        send(ws, {
          event: "error",
          message: (err as Error)?.message || "Server error",
        });
      }
    });

    ws.on("close", () => {
      if (!ws.userId) return;
      onlineUsers.delete(ws.userId);
      userSockets.delete(ws.userId);
      broadcastToAll(wss, {
        event: "userStatus",
        data: { userId: ws.userId, isOnline: false },
      });
    });
  });

  return wss;
}
