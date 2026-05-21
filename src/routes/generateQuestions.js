const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {
  try {
    const { topic, difficulty } = req.body;

    if (!topic || !difficulty) {
      return res.status(400).json({
        message: "topic and difficulty are required",
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    const prompt = `
You are a quiz generator.

Create 5 ${difficulty} multiple-choice questions about: "${topic}".

STRICT RULES:
- Return ONLY valid JSON
- Do NOT include markdown, backticks, or explanations
- Do NOT include any extra text
- Each question must have exactly 4 options
- correctAnswer must match one of the options exactly

OUTPUT FORMAT:
[
  {
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "string"
  }
]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let questions;

    try {
      questions = JSON.parse(text);
    } catch (parseError) {
      console.error(" JSON parse failed");
      console.error("RAW MODEL OUTPUT:\n", text);

      return res.status(500).json({
        message: "Model returned invalid JSON",
        raw: text,
      });
    }

    if (!Array.isArray(questions)) {
      return res.status(500).json({
        message: "Invalid format from model (expected array)",
        raw: questions,
      });
    }

    res.json(questions);
  } catch (error) {
    console.error(" Error generating questions:", error);

    res.status(500).json({
      message: "Failed to generate questions",
    });
  }
});

module.exports = router;