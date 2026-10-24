import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { getAnalytics } from "../controllers/analyticsController.js";

const router = Router();
router.get("/", protect, getAnalytics);
export default router;
