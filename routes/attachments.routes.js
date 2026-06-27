import { Router } from "express";
import { uploadAttachment, getAttachments, deleteAttachment } from "../controllers/attachments.controllers.js";
import { authenticate } from "../middlewares/auth.middlewares.js";
import { upload } from "../utils/multer.utils.js";

const router = Router({ mergeParams: true }); 

router.post("/", authenticate, upload.single("file"), uploadAttachment);
router.get("/", authenticate, getAttachments);
router.delete("/:attachmentId", authenticate, deleteAttachment);

export default router;