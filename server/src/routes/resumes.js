import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { uploadPdf } from "../middleware/upload.js";
import { validateIdParam } from "../middleware/validateId.js";
import * as c from "../controllers/resumeController.js";

const router = Router();
router.use(protect);
router.param("id", validateIdParam);

router.route("/").get(c.list).post(uploadPdf, c.upload);
router.delete("/:id", c.remove);

export default router;
