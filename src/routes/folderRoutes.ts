import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// AWS S3 client
const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME } = process.env;
if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_BUCKET_NAME) {
  throw new Error("Missing AWS S3 configuration in environment variables.");
}

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

// ✅ Upload folder and files
router.post("/upload-folder", upload.array("files"), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const folderName = req.body.folderName || `folder-${Date.now()}`;
    const userId = req.body.userId;

    // Generate a unique folder ID
    const folderId = uuidv4();

    // Folder URL in S3
    const folderUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${folderName}`;

    // Insert folder details into `folder` table
    const { error: folderError } = await supabase.from("folder").insert([
      {
        id: folderId,
        folder_name: folderName,
        folder_url: folderUrl,
        uploaded_at: new Date(),
        deleted_at: null,
        user_id: userId,
      },
    ]);

    if (folderError) {
      console.error("Error inserting folder:", folderError.message);
      return res.status(500).json({ error: "Failed to save folder details" });
    }

    const uploadedFiles = [];

    // Upload files and prepare DB insert
    for (const file of req.files as Express.Multer.File[]) {
      const uploadParams = {
        Bucket: AWS_BUCKET_NAME,
        Key: `${folderName}/${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await s3.send(new PutObjectCommand(uploadParams));

      const fileUrl = `${folderUrl}/${encodeURIComponent(file.originalname)}`;
      uploadedFiles.push({
        id: uuidv4(),
        folder_id: folderId,
        file_name: file.originalname,
        file_url: fileUrl,
        size: file.size,
        format: file.mimetype,
        created_at: new Date(),
        user_id: userId,
      });
    }

    // Insert files into `files` table
    const { error: filesError } = await supabase.from("files").insert(uploadedFiles);

    if (filesError) {
      console.error("Error inserting files:", filesError.message);
      return res.status(500).json({ error: "Failed to save file details" });
    }

    res.json({
      message: "Folder uploaded successfully",
      folderId,
      folderName,
      folderUrl,
      files: uploadedFiles,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
