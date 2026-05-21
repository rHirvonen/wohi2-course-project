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

    // ✅ Use only one stable model (no guessing, no listModels)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
You are a quiz generator.

Create 5 ${difficulty} multiple-choice questions about: "${topic}".

Return ONLY valid JSON (no markdown, no text).

Format:
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
    } catch (err) {
      console.error("❌ JSON parse failed");
      console.error("RAW OUTPUT:", text);

      return res.status(500).json({
        message: "Invalid JSON from AI",
        raw: text,
      });
    }

    if (!Array.isArray(questions)) {
      return res.status(500).json({
        message: "AI response is not an array",
      });
    }

    res.json(questions);
  } catch (error) {
    console.error("❌ Error generating questions:", error);

    res.status(500).json({
      message: "Failed to generate questions",
    });
  }
});

module.exports = router;