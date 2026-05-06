const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const upload = require("../middleware/upload");

router.use(authenticate);


function parseKeywords(keywords) {
  if (Array.isArray(keywords)) return keywords;

  if (typeof keywords === "string") {
    return keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  return [];
}



function formatQuestions(post) {
  return {
    id: post.id,
    question: post.title,
    answer: post.content,
    imageUrl: post.imageUrl,
    date: post.date,
    userId: post.userId,
    keywords: post.keywords?.map((k) => k.name) || [],
    userName: post.user?.name || null,

    
    attempts: post.attempts || [],
  };
}


router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

  const [questions, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        keywords: true,
        user: true,
        attempts: true, 
      },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  res.json({
    page,
    limit,
    total,
    data: questions.map(formatQuestions),
    totalPages: Math.ceil(total / limit),
  });
});


router.get("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);

  const question = await prisma.post.findUnique({
    where: { id: qId },
    include: {
      keywords: true,
      user: true,
      attempts: true,
    },
  });

  if (!question) {
    return res.status(404).json({ message: "Post not found" });
  }

  res.json(formatQuestions(question));
});


router.post("/", upload.single("image"), async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  if (!req.user) {
    return res.status(401).json({ error: "No token provided" });
  }

  const { question, answer, date, keywords } = req.body;

  if (!question || !answer || !date) {
    return res.status(400).json({
      message: "question, answer and date are required",
    });
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const newQuestion = await prisma.post.create({
    data: {
      title: question,
      content: answer,
      userId: req.user.userId,
      date: new Date(date),
      imageUrl,
      keywords: {
        connectOrCreate: parseKeywords(keywords).map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true, user: true },
  });

  res.status(201).json(formatQuestions(newQuestion));
});


router.put("/:qId", upload.single("image"), isOwner, async (req, res) => {
  const qId = Number(req.params.qId);
  const { question, answer, date } = req.body;

  const post = await prisma.post.findUnique({
    where: { id: qId },
  });

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const data = {
    title: question,
    content: answer,
    date: new Date(date),
    imageUrl: post.imageUrl,
  };

  if (req.file) {
    data.imageUrl = `/uploads/${req.file.filename}`;
  }

  const updatedQuestion = await prisma.post.update({
    where: { id: qId },
    data,
    include: { keywords: true, user: true },
  });

  res.json(formatQuestions(updatedQuestion));
});


router.delete("/:qId", isOwner, async (req, res) => {
  const qId = Number(req.params.qId);

  const deletedQuestion = await prisma.post.delete({
    where: { id: qId },
    include: { keywords: true, user: true },
  });

  res.json({
    message: "Question deleted successfully",
    question: formatQuestions(deletedQuestion),
  });
});


router.post("/:qId/play", async (req, res) => {
  const qId = Number(req.params.qId);
  const { answer } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: "No token provided" });
  }

  const question = await prisma.post.findUnique({
    where: { id: qId },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  const correct = answer === question.content;

  const attempt = await prisma.attempt.upsert({
    where: {
      userId_postId: {
        userId: req.user.userId,
        postId: qId,
      },
    },
    update: { correct },
    create: {
      userId: req.user.userId,
      postId: qId,
      correct,
    },
  });

  res.json({
    id: attempt.id,
    correct,
    submittedAnswer: answer,
    correctAnswer: question.content,
    createdAt: attempt.createdAt,
  });
});

module.exports = router;