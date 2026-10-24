export const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ message: err.message, ...err.extra });
  if (err.name === "ValidationError") {
    const first = Object.values(err.errors)[0]?.message || "Invalid data";
    return res.status(400).json({ message: first });
  }
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid id" });
  if (err.code === 11000) return res.status(409).json({ message: "That record already exists" });
  if (err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 5 MB)" : err.message;
    return res.status(400).json({ message });
  }
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Malformed JSON body" });

  console.error(err);
  res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message });
};
