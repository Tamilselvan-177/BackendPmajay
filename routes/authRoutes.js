import express from 'express';
import {
  register,
  login,
  getUserProfile,
  getCollectors,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/collectors', getCollectors);

// Protected routes
router.get('/profile', protect, getUserProfile);

export default router;