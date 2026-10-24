import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { validateIdParam } from "../middleware/validateId.js";
import * as c from "../controllers/reminderController.js";

const router = Router();
router.use(protect);
router.param("id", validateIdParam);

router.route("/").get(c.list).post(c.create);
router.patch("/:id/done", c.markDone);
router.patch("/:id/snooze", c.snooze);

export default router;
