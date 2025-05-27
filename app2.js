const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const app = express();
const PORT = 3000;

dotenv.config(); // Memuat .env

app.use(express.json());
app.use(express.static("public"));

// Ambil API Key dari file .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Ganti ke versi v1beta untuk mendukung model gemini-pro
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;


// Endpoint Chat
app.post("/chat", async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: "Input tidak boleh kosong." });
  }

  try {
    const response = await axios.post(GEMINI_API_URL, {
      contents: [
        {
          parts: [{ text: input }],
          role: "user",
        },
      ],
    });

    const botResponse =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!botResponse) {
      return res
        .status(500)
        .json({ message: "Tidak ada respon dari Gemini API." });
    }

    return res.json({ response: botResponse });
  } catch (error) {
    console.error(
      "Error saat mengakses Gemini API:",
      error.response?.data || error.message
    );
    return res
      .status(500)
      .json({ message: "Gagal mendapatkan jawaban dari Gemini API." });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
