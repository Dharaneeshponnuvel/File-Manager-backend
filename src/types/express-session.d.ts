import { Request } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;  // TS error: sometimes undefined
    name?: string;
  };
}
