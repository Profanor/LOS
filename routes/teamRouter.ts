import express from 'express';
import { createTeam, joinTeam, declineInvite } from '../controller/teamController';

const router = express.Router();

router.post('/api/team/create', createTeam);
  
router.post('/api/team/join', joinTeam);
  
router.post('/api/team/decline-invite', declineInvite);

export default router;