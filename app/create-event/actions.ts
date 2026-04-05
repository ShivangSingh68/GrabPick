"use server";

import { db } from "@/lib/db";
import { UploadImageToS3 } from "@/lib/s3";
import { getCurrentUser } from "@/modules/auth/actions";
import { Messages } from "@/types";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

interface CreateEventProps {
  name: string;
  description?: string;
  password: string;
  images: File[];
}
/*
Returns event id of newly created event
**/
export const createEvent = async (
  data: CreateEventProps,
): Promise<Messages> => {
  const { name, description, password, images } = data;

  try {
    if (!name || !password) {
      return { success: false, error: "Name or Password field is empty" };
    }
    if (!images || images.length === 0) {
      return { success: false, error: "No event images to upload" };
    }

    if (images.length > 10) {
      return {
        success: false,
        error: "Not more than 10 images can be uploaded",
      };
    }
    for (const img of images) {
      if (img.size > 5242880) {
        return { success: false, error: "Image size must be less than 5MB" };
      }
    }
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "User not validated" };
    }
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const event = await db.event.create({
      data: {
        name,
        description,
        passwordHash,
        ownerId: user.id!,
      },
    });

    await Promise.all(
          images.map(async (img) => {
            const imageId = randomUUID();
            const ext = img.type.split("/")[1];

            const key = `events/${event.id}/${imageId}.${ext}`;

            await UploadImageToS3(img, key);

            await db.image.create({
              data: {
                id: imageId,
                eventId: event.id,
                key,
                mimeType: img.type,
                size: img.size,
              },
            });
          })
        );

    return {success: true, data: event.id};

  } catch (error) {
    console.error("Event creation failed: ", error);
    return { success: false, error: error as Error };
  }
};
