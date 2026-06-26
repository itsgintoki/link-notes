import { pgTable, uuid, timestamp, varchar, text, integer } from "drizzle-orm/pg-core";
import { UsersTable } from "./user.model.js";

// notes — id, user_id, title, body, short_code, clicks, created_at, updated_at

export const notesTable = pgTable('notes_table', {
    id: uuid("id").primaryKey().defaultRandom(),

    user_id: uuid("user_id")
        .references(() => UsersTable.id, { onDelete: "cascade" }),


    title: varchar("title", { length: 255 }).notNull(),

    body: text("body").notNull(),

    short_code: varchar('code', { length: 155 })
        .notNull()
        .unique(),

    clicks: integer("clicks")
        .default(0)
        .notNull(),

    created_at: timestamp("created_at", { mode: 'date' })
        .defaultNow()
        .notNull(),

    updated_at: timestamp("updated_at", { mode: 'date' })
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});
