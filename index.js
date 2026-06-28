import 'dotenv/config';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import notesRouter from './routes/notes.routes.js';
import { getNoteByCode } from './controllers/notes.controllers.js';
import authRouter from './routes/auth.routes.js';
import attachmentsRouter from './routes/attachments.routes.js';
import { shortLinkLimiter } from './middlewares/rateLimiter.middlewares.js';
import { errorHandler } from './middlewares/errorHandler.middlewares.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: ['http://localhost:8000', 'http://127.0.0.1:5500','postgresql://postgres:ThsKbQekmxyUtstOXCdGGiGvbZYCyFue@reseau.proxy.rlwy.net:37445/railway'],
  credentials: true
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/notes', notesRouter);
app.get("/n/:code", shortLinkLimiter, getNoteByCode);
app.use('/notes/:id/attachments', attachmentsRouter);
app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});


app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is listening on PORT ${PORT}`);
});

