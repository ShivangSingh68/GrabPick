import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectCommandOutput,
  GetObjectCommand,
  PutBucketAbacCommandOutput,
  PutObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

type GetEventImagesReturns = {
  key: string;
  url: string;
};

const BUCKET = "grabpick-images";
const s3 = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY as string,
  },
});

export async function UploadImagesToS3(
  formData: FormData,
  key: string,
): Promise<PutBucketAbacCommandOutput[]> {
  try {
    const files = formData.getAll("file") as File[];
    if (files.length === 0) {
      throw new Error("No files to upload");
    }
    const response = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileUploadParams = {
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        };

        const imageParam = new PutObjectCommand(fileUploadParams);
        return await s3.send(imageParam);
      }),
    );

    return response;
  } catch (error) {
    console.error("Error uploading files to S3: ", error);
    throw error;
  }
}

//Key must include full path including file extension
export async function DeleteImageFromS3(
  key: string,
): Promise<DeleteObjectCommandOutput> {
  const deleteImageCommand = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  try {
    const res = await s3
      .send(deleteImageCommand)
      .then((res) => res)
      .catch(() => {
        throw new Error("Failed to delete image for S3");
      });

    return res;
  } catch (error) {
    console.error("Failed to delete Image: ", error);
    throw error;
  }
}

export async function DeleteEvent(
  key: string,
): Promise<DeleteObjectCommandOutput> {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: key,
    });
    const listRes = await s3.send(listCommand);
    const eventImages = listRes.Contents;

    if (!eventImages || eventImages.length === 0) {
      throw new Error("No event images found to be deleted");
    }

    const deleteParams = {
      Bucket: BUCKET,
      Delete: {
        Objects: eventImages.map((img) => ({
          Key: img.Key!,
        })),
      },
    };
    const res = await s3.send(new DeleteObjectsCommand(deleteParams));
    return res;
  } catch (error) {
    console.error("Error deleting event: ", error);
    throw error;
  }
}

export async function GetEventImagesFromS3(
  eventId: string,
): Promise<GetEventImagesReturns[]> {
  try {
    const listRes = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `event${eventId}`,
      }),
    );

    const eventImages = listRes.Contents;

    const signedUrls = await Promise.all(
      (eventImages || []).map(async (img) => {
        if (img.Key) {
          const getObjectCommand = new GetObjectCommand({
            Bucket: BUCKET,
            Key: img.Key,
          });
          const url = await getSignedUrl(s3, getObjectCommand, {
            expiresIn: 3600,
          });
          return { key: img.Key, url };
        }
        return null;
      }),
    );

    return signedUrls.filter(
      (item): item is { key: string; url: string } => item !== null,
    );
  } catch (error) {
    console.error("Failed to fetch event images: ", error);
    throw error;
  }
}
