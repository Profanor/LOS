import express from 'express';
import authenticateToken from '../middleware/auth';
import { handleRefresh } from '../controller/tokenRefresh';

const router = express.Router();

router.post('/refresh-token', authenticateToken, handleRefresh);

export default router;