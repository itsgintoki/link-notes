import db from "../db/index.js";
import { attachmentsTable } from "../models/attachments.model.js";
import { notesTable } from "../models/notes.model.js";
import { eq, and } from "drizzle-orm";
import { uploadToCloudinary } from "../utils/multer.utils.js";
import { v2 as cloudinary } from "cloudinary";

export const uploadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.user_id, req.user.id)));

    if (note.length === 0) {
      return next({ status: 403, message: "Forbidden" });
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

    const result = await db.insert(attachmentsTable).values({
      noteId: id,
      originalName: req.file.originalname,
      cloudinaryUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      mimetype: req.file.mimetype,
      size: req.file.size,
    }).returning({
      id: attachmentsTable.id,
      originalName: attachmentsTable.originalName,
      cloudinaryUrl: attachmentsTable.cloudinaryUrl,
      mimetype: attachmentsTable.mimetype,
      size: attachmentsTable.size,
      createdAt: attachmentsTable.createdAt,
    });

    res.status(201).json({ success: true, attachment: result[0] });
  } catch (err) {
    next(err);
  }
};

export const getAttachments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.user_id, req.user.id)));

    if (note.length === 0) {
      return next({ status: 403, message: "Forbidden" });
    }

    const result = await db
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

    res.status(200).json({ success: true, attachments: result });
  } catch (err) {
    next(err);
  }
};

export const deleteAttachment = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;

    const note = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.user_id, req.user.id)));

    if (note.length === 0) {
      return next({ status: 403, message: "Forbidden" });
    }

    const attachment = await db
      .select()
      .from(attachmentsTable)
      .where(and(eq(attachmentsTable.id, attachmentId), eq(attachmentsTable.noteId, id)));

    if (attachment.length === 0) {
      return next({ status: 404, message: "Attachment not found" });
    }

    await cloudinary.uploader.destroy(attachment[0].publicId);

    await db
      .delete(attachmentsTable)
      .where(eq(attachmentsTable.id, attachmentId));

    res.status(200).json({ success: true, message: "Attachment deleted" });
  } catch (err) {
    next(err);
  }
};