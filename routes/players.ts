import authenticateToken from '../middleware/auth';
import express from 'express';
import { signup,switchCharacter,getBattleMeta,searchForPlayer,getPlayerOnlineStatus,addFriend} from '../controller/playerController';

const router = express.Router();

router.post('/api/players/signup', signup);

router.post('/api/players/switch-character', authenticateToken, switchCharacter);
  
router.post('/api/players/get-battle-meta', authenticateToken, getBattleMeta);

router.post('/api/players/search', authenticateToken, searchForPlayer);

router.get('/online-status/:walletAddress', getPlayerOnlineStatus);

router.post('/api/players/addfriend', addFriend);
    
export default router;