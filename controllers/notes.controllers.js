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

const escapeHtml = (str) => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const getNoteByCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    const result = await db
      .select({
        id: notesTable.id,
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

    const attachments = await db
      .select({
        id: attachmentsTable.id,
        originalName: attachmentsTable.originalName,
        cloudinaryUrl: attachmentsTable.cloudinaryUrl,
        mimetype: attachmentsTable.mimetype,
        size: attachmentsTable.size,
      })
      .from(attachmentsTable)
      .where(eq(attachmentsTable.noteId, note.id));

    const escapedTitle = escapeHtml(note.title);
    const escapedBody = escapeHtml(note.body);
    const escapedShortCode = escapeHtml(note.short_code);

    let inlineImagesHtml = "";
    let attachmentsHtml = "";
    if (attachments && attachments.length > 0) {
      const imageAttachments = attachments.filter(
        (a) => a.mimetype && a.mimetype.startsWith("image/")
      );
      if (imageAttachments.length > 0) {
        const imgs = imageAttachments
          .map((a) => {
            const url = escapeHtml(a.cloudinaryUrl);
            const name = escapeHtml(a.originalName);
            return `
              <div class="shared-image-container">
                <img src="${url}" alt="${name}" />
                <div class="shared-image-caption">${name}</div>
              </div>
            `;
          })
          .join("");
        inlineImagesHtml = `
          <div class="shared-images">
            ${imgs}
          </div>
        `;
      }

      const items = attachments
        .map((a) => {
          const name = escapeHtml(a.originalName);
          const url = escapeHtml(a.cloudinaryUrl);
          const size = (a.size / 1024).toFixed(0);
          return `
            <div class="attachment-item">
              <a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>
              <span class="attachment-size">${size}KB</span>
            </div>
          `;
        })
        .join("");

      attachmentsHtml = `
        <div class="attachments-section">
          <div class="attachments-title">/ attachments</div>
          <div class="attachments-list">
            ${items}
          </div>
        </div>
      `;
    }

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapedTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
    
    :root {
      --bg: #f0efeb;
      --color: #0f0f0f;
      --meta: #888;
      --border: #d8d8d4;
      --attachment-bg: #ffffff;
      --attachment-border: #d8d8d4;
      --accent: #e8553d;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #121212;
        --color: #f0efeb;
        --meta: #777;
        --border: #333330;
        --attachment-bg: #1a1a1a;
        --attachment-border: #333330;
        --accent: #e8553d;
      }
    }
    body { font-family: Georgia, serif; max-width: 680px; margin: 60px auto; padding: 0 24px; background: var(--bg); color: var(--color); line-height: 1.8; transition: background 0.2s, color 0.2s; }
    h1 { font-family: 'Inter', -apple-system, sans-serif; font-size: 32px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.02em; text-transform: uppercase; }
    .meta { font-family: 'Space Mono', monospace; font-size: 11px; color: var(--meta); margin-bottom: 40px; text-transform: uppercase; letter-spacing: 0.05em; }
    .body { font-size: 16px; white-space: pre-wrap; }
    .footer { margin-top: 60px; font-family: 'Space Mono', monospace; font-size: 11px; color: var(--meta); border-top: 1px solid var(--border); padding-top: 16px; text-transform: uppercase; }
    
    /* Inline images */
    .shared-images { margin-top: 40px; display: flex; flex-direction: column; gap: 24px; }
    .shared-image-container { border: 1px solid var(--border); border-radius: 4px; overflow: hidden; background: var(--attachment-bg); }
    .shared-image-container img { width: 100%; height: auto; display: block; max-height: 600px; object-fit: contain; background: #000; margin: 0 auto; }
    .shared-image-caption { padding: 10px 16px; font-family: 'Space Mono', monospace; font-size: 11px; color: var(--meta); border-top: 1px solid var(--border); background: var(--attachment-bg); }

    /* Attachments styling */
    .attachments-section { margin-top: 50px; border-top: 1px dashed var(--border); padding-top: 24px; }
    .attachments-title { font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent); margin-bottom: 16px; }
    .attachments-list { display: flex; flex-wrap: wrap; gap: 10px; }
    .attachment-item { display: flex; align-items: center; gap: 8px; background: var(--attachment-bg); border: 1px solid var(--attachment-border); border-radius: 2px; padding: 8px 14px; font-family: 'Space Mono', monospace; font-size: 11px; }
    .attachment-item a { color: var(--color); text-decoration: none; font-weight: 700; }
    .attachment-item a:hover { color: var(--accent); }
    .attachment-size { color: var(--meta); font-size: 9px; }
  </style>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <div class="meta">shared via linknotes · ${new Date(note.created_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })} · ${note.clicks + 1} views</div>
  <div class="body">${escapedBody}</div>
  ${inlineImagesHtml}
  ${attachmentsHtml}
  <div class="footer">/ LINKNOTES · /n/${escapedShortCode}</div>
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