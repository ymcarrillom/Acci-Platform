import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';

import { authRouter } from './routes/auth.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/dashboard', dashboardRouter);

app.listen(env.PORT, () => console.log(`✅ API en http://localhost:${env.PORT}`));
