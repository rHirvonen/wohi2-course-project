const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;