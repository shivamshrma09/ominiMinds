import { logger } from '../../utils/logger';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { pool } from '../../config/db';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rateLimiter';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_OPTIONS: SignOptions = { expiresIn: 604800 }; // 7 days

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    token2fa: z.string().optional(),
  }),
});

const setup2faSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});

const verify2faSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID'),
    token: z.string().min(6).max(6),
  }),
});

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0)
      return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashed]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, JWT_OPTIONS);
    return res.status(201).json({ token, user });
  } catch (err) {
    logger.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password, token2fa } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.two_factor_enabled) {
      if (!token2fa) {
        return res.status(403).json({ message: '2FA token required', requires2fa: true });
      }
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: token2fa,
      });
      if (!verified) {
        return res.status(401).json({ message: 'Invalid 2FA token' });
      }
    }

    const token = jwt.sign({ userId: user.id, twoFactorVerified: true }, JWT_SECRET, JWT_OPTIONS);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    logger.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/2fa/setup
router.post('/2fa/setup', validate(setup2faSchema), async (req: Request, res: Response) => {
  const { userId } = req.body;
  try {
    const secret = speakeasy.generateSecret({ name: 'OmniMind' });
    await pool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret.base32, userId]);
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');
    return res.json({ secret: secret.base32, qrCodeUrl });
  } catch (err) {
    logger.error('2FA setup error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/2fa/verify
router.post('/2fa/verify', validate(verify2faSchema), async (req: Request, res: Response) => {
  const { userId, token } = req.body;
  try {
    const userRes = await pool.query('SELECT two_factor_secret FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user || !user.two_factor_secret) {
      return res.status(400).json({ message: '2FA not setup for this user' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
    });

    if (verified) {
      await pool.query('UPDATE users SET two_factor_enabled = true WHERE id = $1', [userId]);
      return res.json({ message: '2FA enabled successfully' });
    } else {
      return res.status(400).json({ message: 'Invalid token' });
    }
  } catch (err) {
    logger.error('2FA verify error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
