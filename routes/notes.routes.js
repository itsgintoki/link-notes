import { Router } from "express";
import { createNote,getNotes,getNoteById,updateNote,deleteNote } from "../controllers/notes.controllers.js";
import { validate } from "../middlewares/validate.middlewares.js";
import { createNoteSchema } from "../validations/requests.validations.js";

const router = Router();

router.post("/", validate(createNoteSchema), createNote);

router.get("/", getNotes);

router.get("/:id", getNoteById);

router.put("/:id", validate(createNoteSchema), updateNote);

router.delete("/:id", deleteNote);

export default router;