import { nanoid } from "nanoid";
import { ilike, eq, and } from "drizzle-orm";
import db from "../db/index.js";
import { notesTable } from "../models/notes.model.js";
import { attachmentsTable } from "../models/attachments.model.js";

export const createNote = async (req, res, next) => {
    try {
        const { title, body } = req.body;

        const result = await db.insert(notesTable).values({
            title,
            body,
            short_code: nanoid(8),
            user_id: req.user.id,
        }).returning();

        res.status(201).json({ success: true, note: result[0] });
    } catch (err) {
        next(err);
    }
};


export const getNotes = async (req, res, next) => {
    try {
        const { search } = req.query;

        const result = await db
            .select()
            .from(notesTable)
            .where(search
                ? and(ilike(notesTable.title, `%${search}%`), eq(notesTable.user_id, req.user.id))
                : eq(notesTable.user_id, req.user.id)
            )

        res.status(200).json({ success: true, notes: result });
    } catch (err) {
        next(err);
    }
};

export const getNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.user_id, req.user.id)));

    if (note.length === 0) {
      return next({ status: 404, message: "Note not found" });
    }

    const attachments = await db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.noteId, id));

    res.status(200).json({ success: true, note: { ...note[0], attachments } });
  } catch (err) {
    next(err);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, body } = req.body;

    const result = await db
      .update(notesTable)
      .set({ title, body })
      .where(and(eq(notesTable.id, id), eq(notesTable.user_id, req.user.id)))
      .returning();

    if (result.length === 0) {
      return next({ status: 404, message: "Note not found" });
    }

    return res.status(200).json({ success: true, note: result[0] });
  } catch (err) {
    next(err);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db
      .delete(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.user_id, req.user.id)))
      .returning();

    if (result.length === 0) {
      return next({ status: 404, message: "Note not found" });
    }

    res.status(200).json({ success: true, message: "Note deleted" });
  } catch (err) {
    next(err);
  }
};

export const getNoteByCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    const result = await db
      .select({
        title: notesTable.title,
        body: notesTable.body,
        clicks: notesTable.clicks,
        short_code: notesTable.short_code,
        created_at: notesTable.created_at,
      })
      .from(notesTable)
      .where(eq(notesTable.short_code, code));

    if (result.length === 0) {
      return next({ status: 404, message: "Invalid link" });
    }

    await db
      .update(notesTable)
      .set({ clicks: sql`${notesTable.clicks} + 1` }) 
      .where(eq(notesTable.short_code, code));

    res.status(200).json({ success: true, note: result[0] });
  } catch (err) {
    next(err);
  }
};