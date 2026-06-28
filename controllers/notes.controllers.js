import { nanoid } from "nanoid";
import { ilike, eq, and,sql } from "drizzle-orm";
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
    }).returning({
      id: notesTable.id,
      title: notesTable.title,
      body: notesTable.body,
      short_code: notesTable.short_code,
      clicks: notesTable.clicks,
      created_at: notesTable.created_at,
      updated_at: notesTable.updated_at,
    });

    res.status(201).json({ success: true, note: result[0] });
  } catch (err) {
    next(err);
  }
};


export const getNotes = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const escapedSearch = search ? search.replace(/[%_\\]/g, '\\$&') : null;

    const result = await db
      .select({
        id: notesTable.id,
        title: notesTable.title,
        body: notesTable.body,
        short_code: notesTable.short_code,
        clicks: notesTable.clicks,
        created_at: notesTable.created_at,
        updated_at: notesTable.updated_at,
      })
      .from(notesTable)
      .where(escapedSearch
        ? and(ilike(notesTable.title, `%${escapedSearch}%`), eq(notesTable.user_id, req.user.id))
        : eq(notesTable.user_id, req.user.id)
      )
      .limit(parseInt(limit))
      .offset(offset);

    res.status(200).json({ success: true, page: parseInt(page), limit: parseInt(limit), notes: result });
  } catch (err) {
    next(err);
  }
};

export const getNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await db
      .select({
        id: notesTable.id,
        title: notesTable.title,
        body: notesTable.body,
        short_code: notesTable.short_code,
        clicks: notesTable.clicks,
        created_at: notesTable.created_at,
        updated_at: notesTable.updated_at,
      })
      .from(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.user_id, req.user.id)));

    if (note.length === 0) {
      return next({ status: 404, message: "Note not found" });
    }

    const attachments = await db
      .select({
        id: attachmentsTable.id,
        originalName: attachmentsTable.originalName,
        cloudinaryUrl: attachmentsTable.cloudinaryUrl,
        mimetype: attachmentsTable.mimetype,
        size: attachmentsTable.size,
        createdAt: attachmentsTable.createdAt,
      })
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
      .returning({
        id: notesTable.id,
        title: notesTable.title,
        body: notesTable.body,
        short_code: notesTable.short_code,
        clicks: notesTable.clicks,
        created_at: notesTable.created_at,
        updated_at: notesTable.updated_at,
      });

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