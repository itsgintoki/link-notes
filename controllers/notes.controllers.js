import { nanoid } from "nanoid";
import { ilike,eq } from "drizzle-orm";
import db from "../db/index.js";
import { notesTable } from "../models/notes.model.js";

export const createNote = async (req, res, next) => {
  try {
    const { title, body } = req.body;

    const result = await db.insert(notesTable).values({
      title,
      body,
      short_code: nanoid(8),
      user_id: null,  
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
      .where(search ? ilike(notesTable.title, `%${search}%`) : undefined);

    res.status(200).json({ success: true, notes: result });
  } catch (err) {
    next(err);
  }
};

export const getNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, id));

    if (result.length === 0) {
      return next({ status: 404, message: "Note not found" });
    }

    res.status(200).json({ success: true, note: result[0] });
  } catch (err) {
    next(err);
  }
};

export const updateNote = async(req,res,next)=>{
    try{
        const {id} = req.params;
        const {title,body} = req.body;

        const result = await db
        .update(notesTable)
        .set({title,body})
        .where((eq(notesTable.id,id)))
        .returning();

        if(result.length===0){
            return next({status:404,message:"Note Not found!"});
        }
        return res.status(200).json({success:true,note:result[0]});

    }catch(err){
        next(err);
    }
}

export const deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db
      .delete(notesTable)
      .where(eq(notesTable.id, id))
      .returning();

    if (result.length === 0) {
      return next({ status: 404, message: "Note not found" });
    }

    res.status(200).json({ success: true, message: "Note deleted" });
  } catch (err) {
    next(err);
  }
};