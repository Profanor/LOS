import { Request, Response } from 'express';
import AuthorizedTester from '../models/devTest';
import logger from '../logger';

export const devTest = async ( req: Request, res: Response ) => {
    const { testID, deviceID } = req.body;
    
    if (!testID || !deviceID) {
        return res.status(400).json({ error: 'testID and deviceID are required' });
    }
        try {
            const tester = await AuthorizedTester.findOne({ testID, deviceID });
            if (tester) {
                return res.json({ confirmed: true });
            }   else {
                return res.json({ confirmed: false });
            }
        }   catch (error) {
            logger.error(error);
            return res.status(500).json({ error: 'Internal server error' });
        }
};