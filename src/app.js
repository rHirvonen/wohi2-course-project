const path = require("path");
const express = require("express");
const pinoHttp = require("pino-http");

const logger = require("./lib/logger");

const authRouter = require("./routes/auth");
const questionsRouter = require("./routes/questions");


const errorHandler = require("./middleware/errorHandler");

const app = express();

// Paths
const publicPath = path.resolve(
  __dirname,
  "..",
  "public"
);

// Logger
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) =>
        req.url.startsWith("/uploads"),
    },
  })
);

// Middleware
app.use(express.json());

// Static files
app.use(express.static(publicPath));

app.use("/uploads", express.static("uploads"));

// API Routes
app.use("/api/auth", authRouter);

app.use(
  "/api/questions",
  questionsRouter
);


// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

// Frontend
app.get("*", (req, res) => {
  res.sendFile(
    path.join(publicPath, "index.html")
  );
});

// Error handler
app.use(errorHandler);

module.exports = app;