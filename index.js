import 'dotenv/config';
import express from 'express';
import notesRouter from "./routes/notes.routes.js";
import { getNoteByCode } from './controllers/notes.controllers.js';
import authRouter from "./routes/auth.routes.js";


import { errorHandler } from './middlewares/errorHandler.middlewares.js';
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json()); 
app.use("/notes", notesRouter);
app.get("/n/:code", getNoteByCode);
app.use("/auth", authRouter);




app.get('/', (req, res) => {
  res.send("Server is up and running!");
});


app.use(errorHandler);
app.listen(PORT, () => {
  console.log(`Server is listening on PORT ${PORT}`);
});