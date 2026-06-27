import 'dotenv/config';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import notesRouter from './routes/notes.routes.js';
import { getNoteByCode } from './controllers/notes.controllers.js';
import authRouter from './routes/auth.routes.js';
import attachmentsRouter from './routes/attachments.routes.js';
import { errorHandler } from './middlewares/errorHandler.middlewares.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev')); 
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.use('/notes', notesRouter);
app.get('/n/:code', getNoteByCode);
app.use('/notes/:id/attachments', attachmentsRouter);
app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.send('Server is up and running!');
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});


app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is listening on PORT ${PORT}`);
});
