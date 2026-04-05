
import { db } from "@/lib/db";
import { validateEventAccess } from "@/lib/validateEventAccess";
import { Messages } from "@/types"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";


export const joinEvent = async(eventId: string, password: string): Promise<Messages> => {
    if(!eventId || !password) {
        return {success: false, error: "Fields missing"};
    }
    try {
        const event = await db.event.findUnique({
            where: {
                id: eventId,
            } 
        })
        if(!event) {
            return {success: false, error: "Wrong eventid"};
        }

        const passwordHash = event.passwordHash;

        const isPasswordValid = bcrypt.compareSync(password, passwordHash);

        if(!isPasswordValid) {
            return {success: false, error: "Invalid credentials"};
        }
        
        const token = jwt.sign({
            eventId,
        }, 
        process.env.JWT_SECRET!,
        {
            expiresIn: "1d"
        });
        (await cookies()).set("event_token", token, {httpOnly: true});

        const isUserValidated = await validateEventAccess(eventId);

        if(!isUserValidated) {
            return {success: false, error: "User validation failed"};
        }

        return {
            success: true,
            message: "Event joined successfully"
        };

    } catch (error) {
        console.error(error);
        return {success: false, error: error as Error};
    }
}