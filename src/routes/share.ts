// src/routes/share.ts
import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import nodemailer from "nodemailer";
import crypto from "crypto";

dotenv.config();
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS  // app password
  }
});

// Share file API
router.post("/", async (req, res) => {
  try {
    const { file_id, shared_with_email, role } = req.body;

    if (!file_id || !shared_with_email || !role) {
      return res.status(400).json({ error: "file_id, shared_with_email, and role are required" });
    }
    if (!["viewer", "editor", "owner"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex");
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h expiry

    // Store permission with token
    const { data, error } = await supabase
      .from("permissions")
      .insert([{ file_id, shared_with: shared_with_email, role, token, expires_at }])
      .select()
      .single();

    if (error) throw error;

    // Generate share link
    const shareLink = `${process.env.FRONTEND_URL}/view-file/${token}`;

    // Send email
    await transporter.sendMail({
      from: `"File Sharing App" <${process.env.EMAIL_USER}>`,
      to: shared_with_email,
      subject: "You've been given access to a file",
      html: `
        <p>Hello,</p>
        <p>You have been granted <b>${role}</b> access to a file.</p>
        <p>Click below to view:</p>
        <a href="${shareLink}">${shareLink}</a>
        <p>This link will expire in 24 hours.</p>
      `
    });

    return res.json({ message: "File shared & email sent successfully", permission: data });
  } catch (err: any) {
    console.error("Error in /api/share:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Route to validate token and return signed URL
router.get("/validate/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { email } = req.query;

    // Check token, email, expiry
    const { data: perm, error: permErr } = await supabase
      .from("permissions")
      .select("file_id, shared_with, expires_at")
      .eq("token", token)
      .single();

    if (permErr || !perm) return res.status(404).json({ error: "Invalid link" });
    if (perm.shared_with !== email) return res.status(403).json({ error: "Unauthorized email" });
    if (new Date(perm.expires_at) < new Date()) return res.status(410).json({ error: "Link expired" });

    // Get file info
    const { data: fileRow, error: fileErr } = await supabase
      .from("files")
      .select("format")
      .eq("id", perm.file_id)
      .single();

    if (fileErr) throw fileErr;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: fileRow.format
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return res.json({ signedUrl });
  } catch (err: any) {
    console.error("Error validating link:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
