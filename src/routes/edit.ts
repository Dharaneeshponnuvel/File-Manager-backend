import express from "express";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { supabase } from "../services/supabase";

dotenv.config();

const router = express.Router();

// AWS S3 Client setup from .env
const s3 = new S3Client({
  region: process.env.S3_REGION as string,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY as string,
    secretAccessKey: process.env.S3_SECRET_KEY as string,
  },
});

const S3_BUCKET = process.env.S3_BUCKET as string;

/**
 * Extract key from S3 URL
 */
function keyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.substring(1));
  } catch {
    return null;
  }
}
router.get("/folders", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("folder")
      .select("*")
      .is("deleted_at", null); // exclude trashed
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/files", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .is("deleted_at", null); // if you also add deleted_at to files table
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Rename folder or file
 */
router.put("/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    const { new_name } = req.body;

    if (!new_name) return res.status(400).json({ error: "new_name is required" });
    if (!["folder", "files"].includes(type)) {
      return res.status(400).json({ error: "type must be 'folder' or 'files'" });
    }

    const update = type === "folder"
      ? { folder_name: new_name }
      : { file_name: new_name };

    const { data, error } = await supabase
      .from(type)
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Soft delete (Trash)
 */
router.delete("/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!["folder", "files"].includes(type)) {
      return res.status(400).json({ error: "type must be 'folder' or 'files'" });
    }

    const { data, error } = await supabase
      .from(type)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: "Moved to trash", item: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Restore from trash
 */
router.post("/:type/:id/restore", async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!["folder", "files"].includes(type)) {
      return res.status(400).json({ error: "type must be 'folder' or 'files'" });
    }

    const { data, error } = await supabase
      .from(type)
      .update({ deleted_at: null })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: "Restored", item: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Permanent delete
 */
router.delete("/:type/:id/permanent", async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!["folder", "files"].includes(type)) {
      return res.status(400).json({ error: "type must be 'folder' or 'files'" });
    }

    if (type === "files") {
      const { data: fileRow, error: fetchErr } = await supabase
        .from("files")
        .select("id, file_url")
        .eq("id", id)
        .single();

      if (fetchErr || !fileRow) return res.status(404).json({ error: "File not found" });

      const key = keyFromUrl(fileRow.file_url);
      if (key) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
          })
        );
      }
    }

    const { error } = await supabase.from(type).delete().eq("id", id);
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ message: "Permanently deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
