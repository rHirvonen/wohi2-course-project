const path = require("path");
const express = require("express");
const pinoHttp = require("pino-http");
const logger = require("./lib/logger");

const authRouter = require("./routes/auth");
const questionsRouter = require("./routes/questions");
const generateQuestionsRouter = require("./routes/generateQuestions");

const errorHandler = require("./middleware/errorHandler");

const app = express();

const publicPath = path.resolve(__dirname, "..", "public");

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url.startsWith("/uploads"),
    },
  })
);

app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));


// Routes
app.use("/api/auth", authRouter);

app.use("/api/questions", questionsRouter);

app.use("/api/generate-questions", generateQuestionsRouter);



app.get("/", (req, res) => {
  res.send("Test");
});



app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});



app.use(errorHandler);

module.exports = app;