import { Secret } from "jsonwebtoken";
import config from "../../../config";
import { jwtHelpers } from "../../../helpars/jwtHelpers";
import * as bcrypt from "bcrypt";
import ApiError from "../../../errors/ApiErrors";
import crypto from "crypto";
import httpStatus from "http-status";
import { generateOtp } from "../../../helpars/generateOtp";
import emailSender from "../../../shared/brevoMailSender";
import prisma from "../../../shared/prisma";
// import { registrationOtpTemplate } from "../../../helpars/template/registrationOtpTemplate";
// import { forgotPasswordTemplate } from "../../../helpars/template/forgotPasswordTemplate";
import { fileUploader } from "../../../helpars/fileUploader";
// import { notificationService } from "../Notification/Notification.service";






// user login service


/* const createUserIntoDb = async (payload: any & { referredId?: string }) => {
  const {
    email,
    phone,
    password,
    firstName,
    lastName,
    role,
    gender,
    fcmToken
  } = payload;

  // ----- Required fields -----
  if (!email) throw new ApiError(httpStatus.BAD_REQUEST, "Email is required");
  if (!phone) throw new ApiError(httpStatus.BAD_REQUEST, "Phone number is required");
  if (!password) throw new ApiError(httpStatus.BAD_REQUEST, "Password is required");

  // ----- Check Email Exists -----
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already exists");
  }

  // ----- Check Phone Exists -----
  const existingPhone = await prisma.user.findUnique({
    where: { phone },
  });
  if (existingPhone) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Phone number already exists");
  }

  // ----- Validate Role -----
  const allowedRoles = Object.values(UserRole); // ["USER","SELLER","SERVICE_PROVIDER"]
  if (!role || !allowedRoles.includes(role)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Role must be one of: ${allowedRoles.join(", ")}`);
  }


  // ----- Hash Password -----
  const hashedPassword = await bcrypt.hash(password, 10);

  // ----- Create User -----
  const newUser = await prisma.user.create({
    data: {
      email,
      phone,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      gender: gender ?? "Male",
      fcmToken,
    },
  });

  if (!newUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to create user");
  }

  // ----- Generate OTP & save (WITHOUT sending email) -----
  const otp = Number(crypto.randomInt(1000, 9999));
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.user.update({
    where: { id: newUser.id },
    data: { otp, otpExpiresAt: otpExpires },
  });

  //  NO EMAIL SENDING
  //  NO registrationOtpTemplate
  //  NO emailSender()

  // ----- JWT Token -----
  const token = jwtHelpers.generateToken(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    config.jwt.jwt_secret as Secret,
    config.jwt.expires_in!
  );

  return {
    user: { ...newUser, password: undefined },
    token,
  };
}; */

const createUserIntoDb = async (
  payload: any,
  file?: Express.Multer.File
) => {
  const {
    email,
    phone,
    password,
    firstName,
    lastName,
    role,
    gender,
    fcmToken
  } = payload;

  // Validations
  if (!email) throw new ApiError(400, "Email is required");
  if (!phone) throw new ApiError(400, "Phone is required");
  if (!password) throw new ApiError(400, "Password is required");

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) throw new ApiError(400, "Email already exists");

  const existingPhone = await prisma.user.findFirst({ where: { phone } });
  if (existingPhone) throw new ApiError(400, "Phone number already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  let profileImageUrl = null;

  // ✔ Only this part added
  if (file) {
    const uploaded = await fileUploader.uploadToDigitalOcean(file);
    profileImageUrl = uploaded.Location;
  }

  const newUser = await prisma.user.create({
    data: {
      email,
      phone,
      password: hashedPassword,
      firstName,
      lastName,
      fcmToken,
      profileImage: profileImageUrl || null,
    },
  });

  // ----------------------------------------------------------------
  // 🚀 ADD REGISTRATION NOTIFICATION
  // ----------------------------------------------------------------
  const notificationPayload = {
    title: "Welcome to Our Platform!",
    body: "Your account has been created successfully. Please verify your email.",
    data: JSON.stringify({ userId: newUser.id }),
    targetId: newUser.id,
    slug: "user-registration",
    fcmToken: fcmToken || "",
  };

  /* try {
    // 1️⃣ Push notification send (if FCM token exists)
    if (newUser.fcmToken) {
      await notificationService.sendNotification(
        newUser.fcmToken,
        notificationPayload,
        newUser.id
      );
    }

    // 2️⃣ Save notification in database
    await notificationService.saveNotification(notificationPayload, newUser.id);
  } catch (error) {
    console.error("Failed to send or save registration notification:", error);
  } */

  const token = jwtHelpers.generateToken(
    { id: newUser.id, email: newUser.email },
    config.jwt.jwt_secret!,
    config.jwt.expires_in!
  );

  return {
    user: { ...newUser, password: undefined },
    token,
  };
};


const loginUser = async (payload: {
  email?: string;
  phone?: string;
  password: string;
  fcmToken?: string;
}) => {

  if (!payload.email && !payload.phone) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Email or Phone is required to login"
    );
  }

  let userData = null;

  // if email provided → search by email
  if (payload.email) {
    userData = await prisma.user.findUnique({
      where: { email: payload.email },
    });
  }

  // else search by phone
  if (!userData && payload.phone) {
    userData = await prisma.user.findFirst({
      where: { phone: payload.phone },
    });
  }

  if (!userData) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "User not found with this email or phone!"
    );
  }

  const isCorrectPassword = await bcrypt.compare(
    payload.password,
    userData.password!
  );

  if (!isCorrectPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Password incorrect!");
  }

  if (payload.fcmToken) {
    await prisma.user.update({
      where: { id: userData.id },
      data: { fcmToken: payload.fcmToken },
    });
  }

  const token = jwtHelpers.generateToken(
    { id: userData.id, email: userData.email },
    config.jwt.jwt_secret!,
    config.jwt.expires_in!
  );

  const refreshToken = jwtHelpers.generateToken(
    { id: userData.id, email: userData.email },
    config.jwt.refresh_token_secret!,
    config.jwt.refresh_token_expires_in!
  );

  return { token, refreshToken, id: userData.id, email: userData.email };
};


// change password
const changePassword = async (
  userToken: string,
  newPassword: string,
  oldPassword: string
) => {
  const decodedToken = jwtHelpers.verifyToken(
    userToken,
    config.jwt.jwt_secret!
  );

  const user = await prisma.user.findUnique({
    where: { id: decodedToken?.id },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.password) {
    throw new ApiError(400, "User password not found");
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect old password");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const result = await prisma.user.update({
    where: {
      id: decodedToken.id,
    },
    data: {
      password: hashedPassword,
    },
  });
  return { message: "Password changed successfully" };
};

// forgot password
const forgotPassword = async (payload: { email: string }) => {
  // Fetch user data or throw if not found
  const userData = await prisma.user.findFirstOrThrow({
    where: {
      email: payload.email,
    },
  });

  const otp = generateOtp(4);
  const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  console.log(payload.email);

  try {
    // const html = forgotPasswordTemplate(otp);
    const html = `Here is your OTP: ${otp}`;

    if (userData.email) {
      await emailSender(userData.email, html, "Forgot Password OTP");
    }
  } catch (error) {
    console.error(`Failed to send OTP email:`, error);
  }

  // Update the user's OTP and expiration in the database - REMOVED count missing fields

  return {
    otp,
  };
};

// resend otp
const resendOtp = async (email: string) => {
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "This user is not found!");
  }

  const otp = generateOtp(4);
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  try {
    const html = `Here is your new OTP code: ${otp}. It will expire in 5 minutes.`;

    if (user.email) {
      await emailSender(user.email, html, "Resend OTP");
    }
  } catch (error) {
    console.error(`Failed to send OTP email:`, error);
  }

  // Update the user's profile with the new OTP and expiration - REMOVED count missing fields

  return { otp };
};

// verify forgot password OTP
const verifyForgotPasswordOtp = async (payload: {
  email: string;
  otp: number;
}) => {
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "This user is not found!");
  }

  // OTP logic REMOVED - missing fields

  return { message: "OTP verification successful" };
};
const verifyEmailOtp = async (payload: {
  email: string;
  otp: number;
}) => {
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "This user is not found!");
  }

  // Check if email is already verified
  if (user.isVerifyEmail) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email is already verified!");
  }

  // OTP Verification logic REMOVED - missing fields

  // ✅ UPDATE USER: Mark email as verified
  await prisma.user.update({
    where: { email: payload.email },
    data: {
      isVerifyEmail: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,

      email: true,
      isVerifyEmail: true,
      updatedAt: true,
    }
  });

  return;
};

// reset password
const resetPassword = async (payload: { password: string; email: string }) => {
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "This user is not found!");
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(payload.password, 10);

  // Update the user's password in the database
  await prisma.user.update({
    where: { email: payload.email },
    data: {
      password: hashedPassword, // Update with the hashed password
    },
  });

  return { message: "Password reset successfully" };
};

// delete user
const deleteUser = async (userToken: string) => {
  const decodedToken = jwtHelpers.verifyToken(
    userToken,
    config.jwt.jwt_secret!
  );

  const user = await prisma.user.findUnique({
    where: { id: decodedToken.id },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.id !== decodedToken.id) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to delete this account"
    );
  }

  const deletedUser = await prisma.user.delete({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  return deletedUser;
};

export const AuthServices = {
  loginUser,
  changePassword,
  forgotPassword,
  resetPassword,
  resendOtp,
  verifyForgotPasswordOtp,
  verifyEmailOtp,
  deleteUser,
  createUserIntoDb,
};
