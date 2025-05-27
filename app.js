const express = require('express');
const fs = require('fs');
const Fuse = require('fuse.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = 3000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const historyFile = "history.json"; // Nama file history
const MAX_HISTORY = 10; // Batas jumlah history yang dikirim ke API
const session = require('express-session');

app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Fungsi membaca history dari file JSON
function readHistory() {
    if (fs.existsSync(historyFile)) {
        return JSON.parse(fs.readFileSync(historyFile, "utf-8"));
    }
    return { history: [] };
}

// Fungsi menyimpan history ke file JSON
function writeHistory(data) {
    fs.writeFileSync(historyFile, JSON.stringify(data, null, 2));
}

function formatResponse(responseText) {
    return responseText.trim(); // Menghapus spasi ekstra di awal/akhir
}

// Fungsi untuk mendapatkan respons dari Gemini AI
async function generateResponseFromGemini(prompt, chatHistory) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Gabungkan history chat dengan input terbaru
        const historyContext = chatHistory.map(h => `User: ${h.input}\nBot: ${h.response}`).join("\n");
        const fullPrompt = historyContext ? `${historyContext}\nUser: ${prompt}` : `User: ${prompt}`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;

        if (!response || !response.candidates || response.candidates.length === 0) {
            return "Saya tidak bisa menjawab itu saat ini.";
        }

        let text = response.candidates[0].content.parts[0].text;
        return text.replace(/^Bot:\s*/, '') || "Saya tidak bisa menjawab itu saat ini.";

    } catch (error) {
        console.error("Error dari Gemini AI:", error);
        return "Saya tidak bisa menjawab itu saat ini.";
    }
}

// Fungsi mencari respons terbaik dalam otak.json
function findBestMatch(input, percakapan) {
    const fuse = new Fuse(percakapan, { keys: ['input'], threshold: 0.2 });
    const similarResult = fuse.search(input);

    if (similarResult.length > 0) {
        return similarResult[0].item.respon;
    }

    return null;
}

// Gunakan express-session untuk mengelola sesi pengguna
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: null,
        sameSite: 'strict',
        secure: false
    }
}));

// Endpoint untuk mengambil history chat
app.get('/history', (req, res) => {
    res.json(readHistory());
});

// Endpoint untuk menerima pesan dari user dan memberikan respons bot
app.post('/chat', async (req, res) => {
    const { input } = req.body;
    console.log(`User input: ${input}`);

    fs.readFile('./otak.json', 'utf8', async (err, data) => {
        if (err) {
            console.error("Gagal membaca file:", err);
            return res.status(500).json({ message: "Terjadi kesalahan saat membaca data." });
        }

        let dataTraining;
        try {
            dataTraining = JSON.parse(data);
        } catch (error) {
            console.error("Error parsing JSON:", error);
            return res.status(500).json({ message: "Format data tidak valid." });
        }

        const percakapan = dataTraining.percakapan;
        const bestResponse = findBestMatch(input, percakapan);

        let responseText;
        if (bestResponse) {
            responseText = bestResponse;
        } else {
            responseText = await generateResponseFromGemini(input, readHistory().history);
        }

        // Simpan history ke file JSON
        let history = readHistory();
        history.history.push({ input, response: responseText.replace(/^Bot:\s*/, '') });

        if (history.history.length > MAX_HISTORY) {
            history.history.shift();
        }
        writeHistory(history);

        return res.json({ response: responseText });
    });
});

fs.writeFileSync(historyFile, JSON.stringify({ history: [] }, null, 2));
console.log("History chat telah di-reset saat server dimulai.");

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});