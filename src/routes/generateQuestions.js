const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * DEBUG: list models once at startup
 */
(async () => {
  try {
    const models = await genAI.listModels();
    console.log("🔍 AVAILABLE MODELS:");
    console.log(models);
  } catch (err) {
    console.error("❌ Failed to list models:", err);
  }
})();

/**
 * Try multiple models because different keys support different ones
 */
async function getWorkingModel() {
  const candidates = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
  ];

  for (const name of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: name });

      // quick test call (cheap check)
      await model.generateContent("Say OK");
      console.log("✅ Working model:", name);

      return model;
    } catch (err) {
      console.log(`❌ Model failed: ${name}`);
    }
  }

  throw new Error("No working Gemini model found for this API key");
}

router.post("/", async (req, res) => {
  try {
    const { topic, difficulty } = req.body;

    if (!topic || !difficulty) {
      return res.status(400).json({
        message: "topic and difficulty are required",
      });
    }

    const model = await getWorkingModel();

    const prompt = `
You are a quiz generator.

Create 5 ${difficulty} multiple-choice questions about: "${topic}".

Return ONLY valid JSON. No markdown. No extra text.

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

    console.log("🧾 RAW OUTPUT:\n", text);

    let questions;

    try {
      questions = JSON.parse(text);
    } catch (parseError) {
      console.error("❌ JSON parse failed");
      return res.status(500).json({
        message: "Model returned invalid JSON",
        raw: text,
      });
    }

    if (!Array.isArray(questions)) {
      return res.status(500).json({
        message: "Invalid format (not array)",
        raw: questions,
      });
    }

    res.json(questions);
  } catch (error) {
    console.error("❌ Error generating questions:", error);

    res.status(500).json({
      message: error.message || "Failed to generate questions",
    });
  }
});

module.exports = router;