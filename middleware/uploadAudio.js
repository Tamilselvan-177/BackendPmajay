import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/audio/");
  },
  filename(req, file, cb) {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

const audioUpload = multer({
  storage,
  fileFilter(req, file, cb) {
    // 🔥 Allow empty audio (optional)
    if (!file) return cb(null, true);

    // Accept ANY audio format
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file: Only audio files allowed"));
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

export default audioUpload;
