const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

function formatQuestion(question) {
  return {
    ...question,
  };
}

router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

  const questions = await prisma.post.findMany({
    where,
    include: { keywords: true },
    orderBy: { id: "asc" },
  });

  res.json(questions.map(formatQuestion));
});


router.get("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);

  const question = await prisma.post.findUnique({
    where: { id: qId },
    include: { keywords: true },
  });

  if (!question) {
    return res.status(404).json({
      message: "Question not found",
    });
  }

  res.json(formatQuestion(question));
});


router.post("/", async (req, res) => {
  const { title, content, date, keywords } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({
      message: "title, content and date are required",
    });
  }

  const newQuestion = await prisma.post.create({
    data: {
      title,
      content,
      date: new Date(date),
      keywords: {
        connectOrCreate: keywords.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true },
  });

  res.status(201).json(formatQuestion(newQuestion));
});


router.put("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);

  const { title, content, date } = req.body;

  const updatedQuestion = await prisma.post.update({
    where: { id: qId },
    data: {
      title,
      content,
      date: new Date(date),
    },
    include: { keywords: true },
  });

  res.json(formatQuestion(updatedQuestion));
});


router.delete("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);

  const deletedQuestion = await prisma.post.delete({
    where: { id: qId },
  });

  res.json({
    message: "Question deleted successfully",
    question: formatQuestion(deletedQuestion),
  });
});


module.exports = router;