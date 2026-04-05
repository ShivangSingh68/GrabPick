
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.NEXT_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { eventId, imageId, faces } = body;
    if (!faces || faces.length === 0) {
      return NextResponse.json({ error: "No faces" }, { status: 400 });
    }

    await Promise.all(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
      faces.map((f) => {
        return db.$executeRaw`
            INSERT INTO "Face" ("imageId", "eventId", embedding, bbox)
            VALUES(
                ${imageId},
                ${eventId},
                ${f.embedding}::vector,
                ${JSON.stringify(f.bbox ?? {})},
            )`;
      }),
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Internal error" }, { status: 403 });
  }
}
