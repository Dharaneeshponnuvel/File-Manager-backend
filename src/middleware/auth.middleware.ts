import { Request, Response, NextFunction } from "express";
import { supabase } from "../services/supabase";

// AuthRequest interface
export interface AuthRequest extends Request {
  user?: { id: string; email: string; name?: string };
}

export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return res.status(401).json({ message: "Invalid token" });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ message: "Unauthorized" });

    req.user = { id: data.user.id, email: data.user.email, name: data.user.name };
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
};
