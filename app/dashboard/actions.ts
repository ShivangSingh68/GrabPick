
import { db } from "@/lib/db";
import { DeleteEvent } from "@/lib/s3";
import { getCurrentUser } from "@/modules/auth/actions";
import { Messages } from "@/types";
import bcrypt from "bcryptjs";


export const deleteEvent = async (eventId: string): Promise<Messages> => {
  const event = await db.event.findFirst({
    where: {
      id: eventId,
    },
  });
  if (!event) {
    return { success: false, error: "Invalid event id" };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "User not validated" };
  }
  if (event.ownerId !== currentUser.id) {
    return { success: false, error: "Unauthorized to delete this event" };
  }
  const deleteImagesFromS3 = await DeleteEvent(eventId);
  if (!deleteImagesFromS3) {
    return { success: false, error: "Failed to delete event images from S3" };
  }
  const deleteEventFromDb = await db.event.delete({
    where: {
      id: eventId,
    },
  });
  if (!deleteEventFromDb) {
    return { success: false, error: "Failed to delete event from database" };
  }

  return { success: true, message: "Event deleted successfully" };
};

export const updateEventPassword = async (
  eventId: string,
  password: string,
): Promise<Messages> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "User not validated" };
    }
    const event = await db.event.findFirst({
      where: {
        id: eventId,
      },
    });
    if (!event) {
      return { success: false, error: "Invalid event id" };
    }
    if (event.id !== currentUser.id) {
      return { success: false, error: "Unauthorized to change password" };
    }

    const salt = bcrypt.genSaltSync(10);
    const newPasswordHash = bcrypt.hashSync(password, salt);
    const updatedEvent = await db.event.update({
      where: {
        id: event.id,
      },
      data: {
        passwordHash: newPasswordHash,
      },
    });
    if (!updatedEvent) {
      return { success: false, error: "Failed to update password" };
    }
    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};
