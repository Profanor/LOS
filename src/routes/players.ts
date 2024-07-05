import authenticateToken from '../middleware/auth';
import express from 'express';
import { 
    signup,
    switchCharacter,
    getBattleMeta,
    getBattleLog,
    searchForPlayer,
    getPlayerOnlineStatus,
    logout
    } from '../controller/playerController';

const router = express.Router();

router.post('/api/players/signup', signup);

router.post('/api/players/switch-character', authenticateToken, switchCharacter);
  
router.post('/api/players/get-battle-meta', authenticateToken, getBattleMeta);

router.post('/api/players/search', authenticateToken, searchForPlayer);

router.get('/api/players/battle-log', authenticateToken, getBattleLog);

router.get('/online-status/:walletAddress', authenticateToken, getPlayerOnlineStatus);

router.post('/logout', authenticateToken, logout);
    
export default router;