import { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/auth.js";
import { validateIdParam } from "../middleware/validateId.js";
import * as c from "../controllers/applicationController.js";
import { analyze } from "../controllers/matchController.js";

const router = Router();
// AI analysis is the only costly operation, so it gets a per-user limit.
const matchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => String(req.user._id),
  message: { message: "Analysis limit reached (15 per hour). Try again later." },
});

router.use(protect);
router.param("id", validateIdParam);

router.route("/").get(c.list).post(c.create);
router.route("/:id").get(c.getOne).put(c.update).delete(c.remove);
router.patch("/:id/stage", c.moveStage);
router.post("/:id/match", matchLimiter, analyze);

export default router;
