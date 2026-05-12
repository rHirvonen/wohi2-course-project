const path = require("path");
const express = require("express");
const pinoHttp = require("pino-http");
const logger = require("./lib/logger");
const fs = require("fs");

const authRouter = require("./routes/auth");
const questionsRouter = require("./routes/questions");
const errorHandler = require("./middleware/errorHandler");

const app = express();


const publicPath = path.join(process.cwd(), "public");


console.log("PUBLIC PATH:", publicPath);
console.log("PUBLIC EXISTS:", fs.existsSync(publicPath));
console.log("INDEX EXISTS:", fs.existsSync(path.join(publicPath, "index.html")));

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url.startsWith("/uploads"),
    },
  })
);

app.use(express.json());


app.use(express.static(publicPath));


app.use("/api/auth", authRouter);
app.use("/api/questions", questionsRouter);


app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});


app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});


app.use(errorHandler);

module.exports = app;