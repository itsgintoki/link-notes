import { Router } from "express";
import { createNote, getNotes, getNoteById, updateNote, deleteNote } from "../controllers/notes.controllers.js";
import { validate } from "../middlewares/validate.middlewares.js";
import { authenticate } from "../middlewares/auth.middlewares.js";
import { createNoteSchema } from "../validations/requests.validations.js";

const router = Router();

router.post("/", authenticate, validate(createNoteSchema), createNote);
router.get("/", authenticate, getNotes);
router.get("/:id", authenticate, getNoteById);
router.put("/:id", authenticate, validate(createNoteSchema), updateNote);
router.delete("/:id", authenticate, deleteNote);

export default router;