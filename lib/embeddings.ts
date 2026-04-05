import { Messages } from "@/types";
import {LambdaClient, InvokeCommand} from "@aws-sdk/client-lambda"
import { db } from "./db";


const fileToBase64 = async(file: File): Promise<string> =>{
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]
      resolve(base64);
    }

    reader.onerror = reject;
  })
}

const lambda = new LambdaClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  }
})
export const generateEmbedding = async(image: File): Promise<Messages> => {
    try {
      if(!image) {
          return {success: false, error: "No image found to generate embeddings"};
      }
      const base64Image = await fileToBase64(image);

      const response = await lambda.send(
        new InvokeCommand({
          FunctionName: "face-lambda-function",
          Payload: Buffer.from(JSON.stringify({
            image: base64Image
          }))
        })
      );
      const result = JSON.parse(
        Buffer.from(response.Payload!).toString()
      );

      const faces = JSON.parse(result.body);

      const firstFace = faces[0];

      if(!firstFace) {
        return {success: false, error: "No face detected"};
      }
      const embedding = firstFace.embedding;

      return {success: true, data: embedding};

    } catch (error) {
        return {success: false, error: error as Error};
    }
}

//Distance between two vectors must be 0<= dist <=0.5
export const compareEmbeddings = async(vec1: number[], vec2: number[]): Promise<number> => {
    const result = await db.$queryRaw`SELECT $vec1::vector <=> $vec2::vector AS distance`
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    return result[0].distance;
}