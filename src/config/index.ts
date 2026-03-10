import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  whatsapp: {
    session_path: process.env.WHATSAPP_SESSION_PATH || '.wwebjs_auth',
  },
};
