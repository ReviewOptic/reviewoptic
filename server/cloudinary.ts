import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function isCloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export async function uploadToCloudinary(
  filePath: string,
  options: { folder: string; resource_type: "video" | "auto" | "raw" }
): Promise<string> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: options.folder,
    resource_type: options.resource_type,
  });
  return result.secure_url;
}

export async function uploadBufferToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(url: string): Promise<void> {
  // Extract public_id from the URL
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  if (!match) return;
  const publicId = match[1];
  await cloudinary.uploader.destroy(publicId, { resource_type: "video" }).catch(() => {});
}
