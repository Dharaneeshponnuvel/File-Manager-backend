import { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import { Session, SessionData } from "express-session";

const SUPABASE_URL = "https://iifrqchsujoqptmnbzwb.supabase.co";

// Extend Request to include session
interface SessionRequest extends Request {
  session: Session & Partial<SessionData>;
}

export const login = async (req: SessionRequest, res: Response) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "No token provided" });

  try {
    const fetch = (await import("node-fetch")).default;
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/jwks`);
    if (!resp.ok) throw new Error(`Failed to fetch JWKS: ${resp.statusText}`);
    const { keys } = (await resp.json()) as { keys: any[] };

    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || typeof decodedHeader === "string") {
      return res.status(401).json({ message: "Invalid token header" });
    }

    const kid = decodedHeader.header.kid;
    const jwk = keys.find((k) => k.kid === kid);
    if (!jwk) return res.status(401).json({ message: "No matching JWK found" });

    const pem = jwkToPem(jwk);
    const verified = jwt.verify(token, pem) as JwtPayload;

    req.session.user_id = verified.sub;

    res.json({
      message: "Backend session set",
      user_id: verified.sub,
    });
  } catch (err) {
    console.error("JWT verification error:", err);
    res.status(500).json({ message: "Server error verifying token" });
  }
};

export const signup = async (req: Request, res: Response) => {
  res.json({ message: "Signup handled on Supabase client" });
};

export const logout = async (req: SessionRequest, res: Response) => {
  req.session.destroy(() => {});
  res.json({ message: "Logged out" });
};
