import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { upload, processUploadedDoc } from '../../services/documentProcessor';
import { pool } from '../../config/db';

const router = Router();
router.use(authMiddleware);

// POST /api/documents/upload/:clientId
router.post('/upload/:clientId', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const doc = await processUploadedDoc(
      req.file.path,
      req.file.originalname,
      String(req.params.clientId),
      req.userId as string
    );
    return res.status(201).json(doc);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to process document' });
  }
});

// GET /api/documents/:clientId
router.get('/:clientId', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, file_name, summary, key_facts, created_at
       FROM client_documents WHERE client_id=$1 AND user_id=$2 ORDER BY created_at DESC`,
      [String(req.params.clientId), req.userId]
    );
    return res.json(result.rows);
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      `DELETE FROM client_documents WHERE id=$1 AND user_id=$2`,
      [String(req.params.id), req.userId]
    );
    return res.json({ message: 'Deleted' });
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
