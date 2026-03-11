# Messaging Integration Backend Server

This is the backend service for a real-time messaging platform, currently integrating **WhatsApp Web** capabilities via a headless browser. It provides REST APIs for session management (QR code authentication) and fetching chats/messages, along with **Socket.IO** for real-time message synchronization.

Built with **Node.js, Express, TypeScript, Socket.IO, and whatsapp-web.js (Puppeteer)**.

---

## 🚀 Features

- **WhatsApp Web Integration**: Scan QR code to link your WhatsApp account.
- **REST APIs**: Endpoints to get connection status, fetch chat lists, send messages, and logout.
- **Real-Time Sync**: Socket.IO integration to push incoming and outgoing messages instantly to the frontend.
- **Connection Stability**: Auto-reconnection logic and optimized Puppeteer settings for Windows/Linux environments.
- **Multi-device Session Storage**: Saves authentication sessions locally (`.wwebjs_auth`) so you don't have to scan the QR code every time you restart the server.

---

## 🎨 Frontend Client

This backend API is designed to work seamlessly with its Next.js frontend counterpart.

- **Frontend Repository**: [https://github.com/forhadislamse/messaging_frontend_server](https://github.com/forhadislamse/messaging_frontend_server)
- **Live Demo**: [https://messaging-frontend-server.vercel.app/whatsapp](https://messaging-frontend-server.vercel.app/whatsapp)

---

## 💻 Local Setup Instructions

Follow these steps to get the backend running on your local machine.

### 1. Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **Git**

### 2. Clone the Repository

```bash
git clone https://github.com/forhadislamse/messaging_backend_server.git
cd messaging_backend_server
```

### 3. Install Dependencies

Install all required NPM packages:

```bash
npm install
```

### 4. Environment Variables Setup

Create a `.env` file in the root directory by copying the `.env.example` file (or create a new one):

```env
NODE_ENV=development
PORT=13077

# JWT (If used for auth)
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=30d

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./.wwebjs_auth
```

### 5. Running the Application

You can start the server in development mode with live reloading:

```bash
npm run dev
```

If the server starts successfully, you should see logs similar to:
```text
Server is listening on port  http://localhost:13077/api/v1
Socket.IO server running
WhatsApp Service initializing...
[WhatsApp] Need to scan QR code
```

### 6. Linking WhatsApp

Once the server is running, it will generate a QR code. 
- You can access the QR code via the status API endpoint (`GET /api/v1/whatsapp/status`).
- Alternatively, connect your frontend Next.js application to view the QR code visually.
- Open the WhatsApp app on your phone -> Settings -> Linked Devices -> Link a Device, and scan the QR code.
- Once authenticated, the server will log `[WhatsApp] Client is ready!` and you can start fetching chats.

---

## 🚧 Troubleshooting & Common Issues

### 1. "Content unavailable. Resource was not cached." (Frontend Error)
This usually means the frontend is trying to access the backend API or Socket URL that is offline or misconfigured in the frontend `.env` file. Ensure `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_SOCKET_URL` in your frontend point to `http://localhost:13077/api/v1/` and `http://localhost:13077` respectively when testing locally.

### 2. WhatsApp Client Crashes on Initialization (Windows)
If the Puppeteer browser fails to launch:
- Ensure you have Google Chrome installed on your PC.
- The project is already configured with Windows-friendly Puppeteer arguments (`--disable-web-security`, `--disable-gpu`, etc.). But if issues persist, you may need to clear the `.wwebjs_auth` and `.wwebjs_cache` folders and restart.

### 3. Cleaning Up Bad Sessions
If WhatsApp is stuck connecting or throws "No LID for user" errors frequently:
1. Stop the server (`Ctrl + C`).
2. Delete the `.wwebjs_auth` folder in the project root.
3. Start the server again (`npm run dev`) and re-scan the QR code.

---

## ☁️ Deployment Notes (Railway / Render)

Deploying `whatsapp-web.js` requires a server environment that supports headless Chrome (Puppeteer) and WebSocket persistence.

- **Vercel is NOT supported** because Vercel functions are serverless (stateless) and cannot keep a Chrome browser running 24/7 or maintain long-lived Socket connections.
- **Railway.app** or **Render.com** (Web Service) are highly recommended.
- **Dependencies**: The server requires Linux system libraries to run Chrome. If deploying to Railway using the Nixpacks builder, the included `Aptfile` forces the installation of necessary tools like `libnss3` and `libasound2`.

---
*Created by [forhadislamse]*
