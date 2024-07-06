import { Request, Response } from 'express';
import AuthorizedTester from '../models/devTest';
import logger from '../logger';

export const devTest = async ( req: Request, res: Response ) => {
    const { testID, deviceID } = req.body;
    
    if (!testID || !deviceID) {
        return res.status(400).json({ error: 'testID and deviceID are required' });
    }
        try {
            const tester = await AuthorizedTester.findOne({ testID });
            if (tester) {
                if (tester.deviceID) {
                    if (tester.deviceID === deviceID) {
                        return res.json({ confirmed: true });
                    } else {
                        return res.status(403).json({ error: 'Device ID does not match the registered device ID for this test ID.' });
                      }
                    } else {
                        tester.deviceID = deviceID;
                        await tester.save();
                        return res.json({ confirmed: true });
                      }
                    } else {
                        return res.status(404).json({ error: 'Test ID not found.' });
                      }
                    } catch (error) {
                        logger.error(error);
                        return res.status(500).json({ error: 'Internal server error' });
                      }
                    };