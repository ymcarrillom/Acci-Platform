import express from 'express';
import { requireAuth } from '../middlewares/auth.js';

export const usersRouter = express.Router();

usersRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});
