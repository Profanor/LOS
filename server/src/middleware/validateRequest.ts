import { Request, Response, NextFunction } from 'express';

export const validateTesterRequest = (req: Request, res: Response, next: NextFunction) => {
    const { testID, deviceID } = req.body;
    if (!testID || !deviceID) {
        return res.status(400).json({ error: 'testID and deviceID are required' });
    }
    next();
};
