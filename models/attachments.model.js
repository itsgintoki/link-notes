import { pgTable, uuid, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { notesTable } from "./notes.model.js";

// attachments — id, note_id, original_name, cloudinary_url, public_id, mimetype, size, created_at

export const attachmentsTable = pgTable("attachments_table", {
    id: uuid("id").primaryKey().defaultRandom(),

    noteId: uuid("note_id")
        .notNull()
        .references(() => notesTable.id, { onDelete: "cascade" }),

    originalName: varchar("original_name", { length: 255 }).notNull(),

    cloudinaryUrl: text("cloudinary_url").notNull(),

    publicId: varchar("public_id", { length: 255 }).notNull(),

    mimetype: varchar("mimetype", { length: 100 }).notNull(),

    // Stored in bytes
    size: integer("size").notNull(),

    createdAt: timestamp("created_at", { mode: 'date' })
        .defaultNow()
        .notNull(),
});
