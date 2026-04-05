
import { db } from "@/lib/db";
import { DeleteImageFromS3, UploadImagesToS3 } from "@/lib/s3";
import { getCurrentUser } from "@/modules/auth/actions";
import { Messages } from "@/types";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { validateEventAccess } from "@/lib/validateEventAccess";


export const deleteImage = async (imageId: string): Promise<Messages> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "User not validated" };
  }
  try {
    const image = await db.image.findUnique({
      where: {
        id: imageId,
      },
    });
    if (!image) {
      return { success: false, error: "No image found" };
    }
    const event = await db.event.findUnique({
      where: {
        id: image.eventId,
      },
    });
    if (!event) {
      return { success: false, error: "Image has no event" };
    }
    if (event.ownerId !== currentUser) {
      return { success: false, error: "Only event owner can delete images" };
    }

    const response = await DeleteImageFromS3(image.key);
    if (!response) {
      return { success: false, error: "Failed to delete images from S3" };
    }
    const deleteFromDb = await db.image.delete({
      where: {
        id: imageId,
      },
    });
    if (!deleteFromDb) {
      return { success: false, error: "Failed to delete from database" };
    }
    return { success: true, message: "Image deleted successfully" };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

export const addImages = async (
  eventId: string,
  files: File[],
): Promise<Messages> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "User not validated" };
  }

  if (!eventId || !files || files.length === 0) {
    return { success: false, error: "Fields missing" };
  }
  const event = await db.event.findUnique({
    where: {
      id: eventId,
    },
  });
  if (!event) {
    return { success: false, error: "Invalid event id" };
  }
  const uploadToS3 = await UploadImagesToS3(files, eventId);
  if (!uploadToS3) {
    return { success: false, error: "Failed to upload to S3" };
  }
  const imagesData = files.map((img) => {
    return {
      eventId,
      key: img.name,
      size: img.size,
      mimeType: img.type,
    };
  });
  const savedToDb = await db.image.createMany({
    data: imagesData,
  });

  if (savedToDb.count === 0) {
    return { success: false, error: "Failed to save images in database" };
  }

  return {
    success: true,
    data: savedToDb.count,
    message: "Images added successfully",
  };
};

export const sortImages = async (
  eventId: string,
  order: "asc" | "desc",
): Promise<Messages> => {
  try {
    const event = await db.event.findUnique({
      where: {
        id: eventId,
      },
    });
    if(!event) {
        return {success: false, error: "Invalid event id"};
    }
    const sortedImages = await db.image.findMany({
        where: {
            eventId,
        },
        orderBy: {
            size: order
        },
        select: {
            key: true
        }
    })
    if(!sortedImages) {
        return {success: false, error: "No images to sort"};
    }
    return {success: true, data: sortedImages, message: "Sorted images fetched successfully"};
  } catch (error) {
        return {success: false, error: error as Error};
  }
};

//This function also sets the cookie in the browser
export const verifyPassword = async (
  eventId: string,
  password: string,
): Promise<Messages> => {
  try {
    if (!eventId || !password) {
      return { success: false, error: "Fields missing" };
    }
    const event = await db.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        passwordHash: true,
      },
    });
    if (!event) {
      return { success: false, error: "Invalid event id" };
    }

    const isPasswordCorrect = bcrypt.compareSync(password, event.passwordHash);

    if (!isPasswordCorrect) {
      return { success: false, error: "Invalid credentials" };
    }
    const cookieStore = await cookies();
    const token = jwt.sign(
      {
        eventId,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "1d",
      },
    );
    cookieStore.set("event_token", token, { httpOnly: true });
    const isUserValidated = await validateEventAccess(eventId);
    if(!isUserValidated) {
        return {success: false, error: "User validation failed"};
    }
    return { success: true, message: "Password validated successfully" };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};
