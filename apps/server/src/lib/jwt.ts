import jwt from 'jsonwebtoken';

const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or too short; ensure env is loaded before startup');
  }
  return secret;
}

export function createToken(userId: string, email: string): string {
  const payload: TokenPayload = { userId, email };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
}
