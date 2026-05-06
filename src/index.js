const express = require("express");
const app = express();
const prisma = require("./lib/prisma");
const multer = require("multer");
const path = require("path");

app.use(express.json());



app.use(express.static(path.join(__dirname, "..", "public")));



app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));

// routes
app.use("/api/questions", require("./routes/questions"));
app.use("/api/auth", require("./routes/auth"));


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});


app.use((err, req, res, next) => {
  if (
    err instanceof multer.MulterError ||
    err?.message === "Only image files are allowed"
  ) {
    return res.status(400).json({ msg: err.message });
  }
  next(err);
});


app.use((req, res) => {
  res.json({ msg: "Not found" });
});

app.listen(3000, () => {
  console.log("http://localhost:3000");
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});