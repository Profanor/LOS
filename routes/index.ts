import express from 'express';

const router = express.Router();

router.get('/', (req, res)=> {
    res.send('Welcome to Project-Los Server...');
});

export default router;