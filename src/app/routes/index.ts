import express from "express";
import { AuthRoutes } from "../modules/Auth/auth.routes";
import { WhatsAppRoutes } from "../modules/whatsapp/whatsapp.routes";
import { userRoutes } from "../modules/User/user.route";

import { fileUploadRoutes } from "../modules/fileUpload/fileUpload.routes";
// import { NotificationRoutes } from "../modules/Notification/Notification.routes";

// import { userCategoryInterestRoutes } from "../modules/admin/userCategoryInterest/userCategoryInterest.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/file-uploads",
    route: fileUploadRoutes,
  },
  {
    path: "/uploads",
    route: fileUploadRoutes,
  },
  {
    path: "/whatsapp",
    route: WhatsAppRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

// // Base route for /api/v1
// router.get("/", (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: "Zeo Solar API v1 is operational!",
//   });
// });

export default router;
