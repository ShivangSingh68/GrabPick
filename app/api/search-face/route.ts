
import { db } from "@/lib/db";
import { compareEmbeddings, generateEmbedding } from "@/lib/embeddings";
import { type NextRequest, NextResponse } from "next/server";

//this function does not return images but the image id's
export async function POST(req: NextRequest) {
    const body = await req.json();
    const {eventId, face} = body;

    try {
        if(!eventId || !face) {
            return NextResponse.json({error: "EventId or face image is missing"}, {status: 406})
        }
        const event = await db.event.findFirst();
        if(!event) {
            return NextResponse.json({error: "Invalid event id"}, {status: 500});
        }

        const faces = await db.$queryRaw< {id: string; imageId: string; embedding: number[]}[]
        >`
            SELECT id, image_id as "imageId, embedding
            FROM "Face"
            WHERE event_id = ${eventId}
        `
        if(!faces || faces.length === 0) {
            return NextResponse.json({error: "Event has no image containing persons"});
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        const searchFaceEmbeddings: number[] = (await generateEmbedding(face)).data;

        if(!searchFaceEmbeddings || searchFaceEmbeddings.length !== 512) {
            return NextResponse.json({error: "Failed to generate face embeddings, try to upload another image"}, {status: 403})
        }
        const result = await Promise.all(faces.map(async (face) => {
            const distance = await compareEmbeddings(face.embedding, searchFaceEmbeddings);

            if(distance < 0.5) {
                return face.imageId;
            }
            return null;
        }));
        const similarFaces = result.filter(Boolean);

        return NextResponse.json({
            eventImages: similarFaces
        });

    } catch (error) {
        console.log("Face-search api error: ", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown Error";
        return NextResponse.json({
            error: "Failed face search",
            details: errorMessage,
            timeStamp: new Date().toISOString(),
        },{
            status: 500,
        })
    }
}