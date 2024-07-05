import express from 'express';
import { devTest } from '../controller/devTest';
import { validateTesterRequest } from '../middleware/validateRequest';
const router = express.Router();

router.post('/confirm-tester', validateTesterRequest, devTest);

export default router;