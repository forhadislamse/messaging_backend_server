import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import * as bcrypt from "bcrypt";
import config from "../../../config";
import httpStatus from "http-status";
import { jwtHelpers } from "../../../helpars/jwtHelpers";
import { omit } from "lodash";
import { IUserFilters } from "./user.interface";
import { fileUploader } from "../../../helpars/fileUploader";
import { deleteImageAndFile } from "../../../helpars/fileDelete";
import { User } from "@prisma/client";

// get user profile
const getMyProfile = async (userToken: string) => {
  const decodedToken = jwtHelpers.verifyToken(
    userToken,
    config.jwt.jwt_secret!
  );

  const userProfile = await prisma.user.findUnique({
    where: {
      id: decodedToken.id,
    },
  });

  if (!userProfile) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  const userWithoutPassword = omit(userProfile, ["password"]);

  return userWithoutPassword;
};

//update user profile
const updateUserProfile = async (
  userId: string,
  updateData: Partial<User>,
  file?: Express.Multer.File
) => {
  // Check if user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  // Disallow updating email or password
  if (updateData.password) throw new ApiError(400, "Password cannot be updated");
  if (updateData.email) throw new ApiError(400, "Email cannot be updated");

  // Handle profile image upload
  if (file) {
    const uploadedImageUrl = await fileUploader.uploadToDigitalOcean(file);
    updateData.profileImage = uploadedImageUrl.Location;

    // Delete old image if exists
    if (user.profileImage) {
      await deleteImageAndFile.deleteFileFromDigitalOcean(user.profileImage);
    }
  }

  // Only update fields that are provided or image is updated
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...updateData,
      updatedAt: new Date(),
    },
  });

  return { ...updatedUser, password: undefined };
};


//update user profile image
const updateUserProfileImage = async (userToken: string, imageUrl: string) => {
  const decodedToken = jwtHelpers.verifyToken(
    userToken,
    config.jwt.jwt_secret!
  );

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: {
      id: decodedToken.id,
    },
  });

  if (!existingUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id: decodedToken.id }, // ✅ fixed here
    data: {
      profileImage: imageUrl,
    },
    select: {
      id: true,
      profileImage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const toggleUserOnlineStatus = async (
  userToken: string,
  isUserOnline: boolean
) => {
  const decodedToken = jwtHelpers.verifyToken(
    userToken,
    config.jwt.jwt_secret!
  );

  const existingUser = await prisma.user.findUnique({
    where: {
      id: decodedToken.id,
    },
  });

  if (!existingUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id: decodedToken.id },
    data: {
      isUserOnline,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profileImage: true,
      phone: true,
      isUserOnline: true,
      updatedAt: true,
    },
  });

  const userWithoutSensitive = omit(updatedUser, ["password", "fcmToken"]);
  return userWithoutSensitive;
};



// toggle user online status
const toggleNotificationOnOff = async (
  userToken: string,
  isNotificationOn: boolean
) => {
  const decodedToken = jwtHelpers.verifyToken(
    userToken,
    config.jwt.jwt_secret!
  );

  const existingUser = await prisma.user.findUnique({
    where: {
      id: decodedToken.id,
    },
  });

  if (!existingUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id: decodedToken.id },
    data: {
      isNotificationOn,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profileImage: true,
      phone: true,
      isNotificationOn: true,
      updatedAt: true,
    },
  });

  const userWithoutSensitive = omit(updatedUser, ["password", "fcmToken"]);
  return userWithoutSensitive;
};




export const UserService = {
  getMyProfile,
  updateUserProfile,
  updateUserProfileImage,
  toggleUserOnlineStatus,
  toggleNotificationOnOff,
};
