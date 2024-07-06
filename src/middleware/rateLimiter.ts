import rateLimit from 'express-rate-limit';

// Rate limiting middleware for sign-up and login
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 1 minute'
});

export default limiter;
