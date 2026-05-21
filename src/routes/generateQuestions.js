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

Return ONLY valid JSON:
[
  {
    "question": "",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": ""
  }
]
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    // 🔥 TÄRKEÄ FIX 1: tarkista HTTP virhe
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini HTTP error:", errorText);

      return res.status(500).json({
        message: "Gemini API error",
        raw: errorText,
      });
    }

    const data = await response.json();

    console.log("🔍 Gemini raw response:", JSON.stringify(data, null, 2));

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    // 🔥 FIX 2: jos ei dataa → STOP
    if (!text) {
      return res.status(500).json({
        message: "No valid content from Gemini",
        raw: data,
      });
    }

    let questions;

    try {
      questions = JSON.parse(
        text.replace(/```json/g, "").replace(/```/g, "").trim()
      );
    } catch (err) {
      console.error("❌ JSON parse failed:", text);

      return res.status(500).json({
        message: "Invalid JSON from Gemini",
        raw: text,
      });
    }

    return res.json(questions);
  } catch (error) {
    console.error("❌ Server error:", error);

    return res.status(500).json({
      message: "Backend crash",
      error: error.message,
    });
  }
});

module.exports = router;