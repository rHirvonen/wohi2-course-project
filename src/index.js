const express = require('express');
const app = express();
const prisma = require("./lib/prisma");

app.use(express.json());

const questionsRouter = require("./routes/questions");
const authRouter = require("./routes/auth");


const PORT = process.env.PORT || 3000;

app.use("/api/auth", authRouter);
app.use("/api/questions", questionsRouter);

app.use((req, res) => {
  res.json({msg: "Not found"});
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
