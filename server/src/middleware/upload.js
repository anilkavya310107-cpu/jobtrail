import multer from "multer";
import HttpError from "../utils/httpError.js";

export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" && /\.pdf$/i.test(file.originalname);
    cb(isPdf ? null : new HttpError(400, "Only PDF files are accepted"), isPdf);
  },
}).single("resume");
