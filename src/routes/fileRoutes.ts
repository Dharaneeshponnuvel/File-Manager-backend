import { Router, Response } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import upload from "../middleware/upload";
import { supabase } from "../services/supabase";
import dotenv from "dotenv";
import { authenticateUser, AuthRequest } from "../middleware/auth.middleware";
import { NextFunction } from "express";

dotenv.config();


interface FileUploadRequest extends AuthRequest {
  file?: Express.Multer.File;
}
const router = Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

router.post(
  "/upload",
  authenticateUser,
  upload.single("file"),
  async (req: FileUploadRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileName = `${Date.now()}-${req.file.originalname}`;
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      await s3.send(command);

      const file_Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      const { error } = await supabase.from("files").insert([
        {
          file_name: fileName,
          file_url: file_Url,
          size: req.file.size,
          format: req.file.mimetype,
          user_id: req.user?.id,
        },
      ]);

      if (error) {
        console.error("Supabase insert error:", error);
        return res.status(500).json({ message: "Error saving file metadata" });
      }

      res.status(201).json({
        message: "File uploaded successfully",
        file_url: file_Url,
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed", error: err.message });
    }
  }
);

export default router;
