import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getCurrentUser } from "@/modules/auth/actions";
import { db } from "./db";

export const validateEventAccess = async(eventId: string): Promise<boolean> => {
    const cookieStore = await cookies();

    const token = cookieStore.get("event_token")?.value;

    if(!token) {
        return false;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            eventId: string;
        };

        return decoded.eventId === eventId;
    } catch (error) {
        return false;
    }
}

export const isOwner = async(eventId: string): Promise<boolean> => {
    const currentUser = await getCurrentUser();
    if(!currentUser) {
        console.error("User not validated")
        return false;
    }

    const event = await db.event.findFirst({
        where: {
            id: eventId
        }
    })
    if(!event){
        console.error("No event found");
        return false;
    }

    return event.ownerId === currentUser.id;
}