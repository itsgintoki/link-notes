import { Router } from "express";
import { createNote, getNotes, getNoteById, updateNote, deleteNote,pinNote } from "../controllers/notes.controllers.js";
import { validate } from "../middlewares/validate.middlewares.js";
import { authenticate } from "../middlewares/auth.middlewares.js";
import { createNoteSchema } from "../validations/requests.validations.js";
import { notesLimiter } from "../middlewares/rateLimiter.middlewares.js";

const router = Router();

router.post("/", notesLimiter, authenticate, validate(createNoteSchema), createNote);
router.get("/", authenticate, getNotes);
router.get("/:id", authenticate, getNoteById);
router.put("/:id", authenticate, validate(createNoteSchema), updateNote);
router.patch("/:id/pin", authenticate, pinNote);
router.delete("/:id", authenticate, deleteNote);


export default router;