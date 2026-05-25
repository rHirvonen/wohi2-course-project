const express = require("express");
const router = express.Router();
const multer = require("multer");

const prisma = require("../lib/prisma");
const upload = require("../middleware/upload");
const authenticate = require("../middleware/auth");

const {
  NotFoundError,
  UnauthorizedError,
} = require("../lib/errors");

const { z } = require("zod");

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

function formatQuestion(question) {
  return {
    id: question.id,
    question: question.title,
    answer: question.content,
    imageUrl: question.imageUrl,
    difficulty: question.difficulty || "easy",
    date: question.date,
    userId: question.userId,
    keywords:
      question.keywords?.map((k) => k.name) || [],
    userName: question.user?.name || null,
    attempts: question.attempts || [],
  };
}

const PostInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  date: z.string().min(1),

  difficulty: z
    .enum(["easy", "medium", "hard"])
    .optional(),

  keywords: z
    .union([z.string(), z.array(z.string())])
    .optional(),
});

// GET ALL QUESTIONS
router.get("/", async (req, res, next) => {
  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 5;
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    const where = {};

    // FILTER BY KEYWORD
    if (req.query.keyword) {
      where.keywords = {
        some: {
          name: req.query.keyword,
        },
      };
    }

    // FILTER BY DIFFICULTY
    if (req.query.difficulty) {
      where.difficulty = req.query.difficulty;
    }

    // SEARCH
    if (req.query.search) {
      where.OR = [
        {
          title: {
            contains: req.query.search,
          },
        },
        {
          content: {
            contains: req.query.search,
          },
        },
      ];
    }

    const [questions, total] = await Promise.all([
      prisma.post.findMany({
        where,

        include: {
          keywords: true,
          user: true,
          attempts: true,
        },

        orderBy: {
          id: "asc",
        },

        skip,
        take: limit,
      }),

      prisma.post.count({ where }),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),

      data: questions.map(formatQuestion),
    });
  } catch (err) {
    next(err);
  }
});

// LEADERBOARD TOP 5
router.get(
  "/leaderboard/top",
  async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        include: {
          attempts: {
            where: {
              correct: true,
            },
          },
        },
      });

      const leaderboard = users
        .map((user) => ({
          id: user.id,
          name: user.name,
          score: user.attempts.length,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      res.json(leaderboard);
    } catch (err) {
      next(err);
    }
  }
);

// GET SINGLE QUESTION
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const post = await prisma.post.findUnique({
      where: { id },

      include: {
        keywords: true,
        user: true,
        attempts: true,
      },
    });

    if (!post) {
      throw new NotFoundError(
        "Question not found"
      );
    }

    res.json(formatQuestion(post));
  } catch (err) {
    next(err);
  }
});

// CREATE QUESTION
router.post(
  "/",
  authenticate,
  upload.single("image"),

  async (req, res, next) => {
    try {
      const data = PostInput.parse(req.body);

      const created = await prisma.post.create({
        data: {
          title: data.question,
          content: data.answer,

          difficulty:
            data.difficulty || "easy",

          userId: req.user.id,

          date: new Date(data.date),

          imageUrl: req.file
            ? `/uploads/${req.file.filename}`
            : null,

          keywords: {
            connectOrCreate: parseKeywords(
              data.keywords
            ).map((kw) => ({
              where: {
                name: kw,
              },

              create: {
                name: kw,
              },
            })),
          },
        },

        include: {
          keywords: true,
          user: true,
        },
      });

      res
        .status(201)
        .json(formatQuestion(created));
    } catch (err) {
      next(err);
    }
  }
);

// PLAY QUESTION
router.post(
  "/:id/play",
  authenticate,

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const { answer } = req.body;

      const post = await prisma.post.findUnique({
        where: { id },
      });

      if (!post) {
        throw new NotFoundError(
          "Question not found"
        );
      }

      const isCorrect =
        post.content.trim().toLowerCase() ===
        answer?.trim().toLowerCase();

      try {
        await prisma.attempt.create({
          data: {
            userId: req.user.id,
            postId: id,
            correct: isCorrect,
          },
        });
      } catch (err) {
        // USER ALREADY ANSWERED
        if (err.code === "P2002") {
          await prisma.attempt.update({
            where: {
              userId_postId: {
                userId: req.user.id,
                postId: id,
              },
            },

            data: {
              correct: isCorrect,
            },
          });
        } else {
          throw err;
        }
      }

      res.json({
        correct: isCorrect,
        correctAnswer: post.content,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE QUESTION
router.delete(
  "/:id",
  authenticate,

  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const post = await prisma.post.findUnique({
        where: { id },
      });

      if (!post) {
        throw new NotFoundError(
          "Question not found"
        );
      }

      // ONLY OWNER CAN DELETE
      if (post.userId !== req.user.id) {
        throw new UnauthorizedError(
          "Not allowed"
        );
      }

      await prisma.post.delete({
        where: { id },
      });

      res.json({
        message: "Question deleted",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ERROR HANDLER
router.use((err, req, res, next) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      message: "Invalid input",
    });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.message,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      message: err.message,
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      message: err.message,
    });
  }

  console.error(err);

  return res.status(500).json({
    message: "Internal server error",
  });
});

module.exports = router;