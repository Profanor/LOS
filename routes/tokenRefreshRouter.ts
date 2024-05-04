import express from 'express';
import { handleRefresh } from '../controller/tokenRefresh';

const router = express.Router();

router.post('/refresh-token', handleRefresh);

export default router;