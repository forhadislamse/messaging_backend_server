

import admin from "firebase-admin";
import config from "../config";

admin.initializeApp({
  credential: admin.credential.cert(config.firebase as admin.ServiceAccount),
});

export default admin;
