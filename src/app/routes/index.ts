import express from "express";
import { WhatsAppRoutes } from "../modules/whatsapp/whatsapp.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/whatsapp",
    route: WhatsAppRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
