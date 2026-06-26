import { Router } from "express";
import { register,login,getMe } from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validate.middlewares.js";
import { registerSchema,loginBodySchema } from "../validations/requests.validations.js";
import { authenticate } from "../middlewares/auth.middlewares.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginBodySchema), login);
router.get("/me", authenticate, getMe);

export default router;