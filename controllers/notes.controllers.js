import db from "../db/index.js";
import { nanoid } from "nanoid";
import { ilike, eq, and, sql, desc } from "drizzle-orm";
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
      .offset(offset)
      .orderBy(desc(notesTable.is_pinned), desc(notesTable.created_at));

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

    const note = result[0];

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${note.title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 680px; margin: 60px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.8; }
    h1 { font-size: 32px; margin-bottom: 8px; }
    .meta { font-size: 13px; color: #999; margin-bottom: 40px; font-family: monospace; }
    .body { font-size: 16px; white-space: pre-wrap; }
    .footer { margin-top: 60px; font-family: monospace; font-size: 11px; color: #ccc; border-top: 1px solid #eee; padding-top: 16px; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <div class="meta">shared via linknotes · ${new Date(note.created_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })} · ${note.clicks + 1} views</div>
  <div class="body">${note.body}</div>
  <div class="footer">/ LINKNOTES · /n/${note.short_code}</div>
</body>
</html>`);
  } catch (err) {
    next(err);
  }
};


export const pinNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await db
      .select({ is_pinned: notesTable.is_pinned })
      .from(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.user_id, req.user.id)));

    if (note.length === 0) {
      return next({ status: 404, message: "Note not found" });
    }

    const result = await db
      .update(notesTable)
      .set({ is_pinned: !note[0].is_pinned })
      .where(and(eq(notesTable.id, id), eq(notesTable.user_id, req.user.id)))
      .returning({
        id: notesTable.id,
        is_pinned: notesTable.is_pinned,
      });

    res.status(200).json({ success: true, note: result[0] });
  } catch (err) {
    next(err);
  }
};