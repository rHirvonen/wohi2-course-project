const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { topic, difficulty } = req.body;

    if (!topic || !difficulty) {
      return res.status(400).json({
        message: "topic and difficulty are required",
      });
    }

    const prompt = `
Generate 5 ${difficulty} multiple-choice quiz questions about "${topic}".

Return ONLY valid JSON in this format:
[
  {
    "question": "",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": ""
  }
]
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Gemini error response:", data);
      return res.status(500).json({
        message: "No response from Gemini",
        raw: data,
      });
    }

    let questions;

    try {
      questions = JSON.parse(
        text.replace(/```json/g, "").replace(/```/g, "").trim()
      );
    } catch (err) {
      return res.status(500).json({
        message: "Invalid JSON from Gemini",
        raw: text,
      });
    }

    res.json(questions);
  } catch (error) {
    console.error("Error:", error);

    res.status(500).json({
      message: "Failed to generate questions",
    });
  }
});

module.exports = router;