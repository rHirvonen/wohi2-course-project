const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

router.post("/", async (req, res) => {
  try {
    const { topic, difficulty } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
Generate 5 ${difficulty} multiple choice quiz questions about ${topic}.

Return ONLY valid JSON in this format:

[
  {
    "question": "",
    "options": ["", "", "", ""],
    "correctAnswer": ""
  }
]
`;

    const result = await model.generateContent(
      prompt
    );

    const response = await result.response;

    const text = response.text();

    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const questions = JSON.parse(cleanText);

    res.json(questions);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to generate questions",
    });
  }
});

module.exports = router;