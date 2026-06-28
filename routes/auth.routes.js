import { Router } from "express";
import { register,login,getMe,logoutAll,refresh ,logout } from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validate.middlewares.js";
import { registerSchema,loginBodySchema } from "../validations/requests.validations.js";
import { authenticate,} from "../middlewares/auth.middlewares.js";
import { authLimiter } from "../middlewares/rateLimiter.middlewares.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginBodySchema), login);
router.post("/refresh", authLimiter, refresh);
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);
router.post("/logout-all", authenticate, logoutAll);

export default router;