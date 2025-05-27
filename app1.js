const express = require('express');
const fs = require('fs');
const Fuse = require('fuse.js'); // Import Fuse.js untuk pencarian yang lebih fleksibel
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

app.post('/chat', (req, res) => {
    const { input } = req.body;

    // Baca file JSON untuk mencari jawaban yang sesuai
    fs.readFile('./otak.json', 'utf8', (err, data) => {
        if (err) {
            console.error("Gagal membaca file:", err);
            return res.status(500).json({ message: "Gagal membaca data." });
        }

        let dataTraining;
        try {
            dataTraining = JSON.parse(data);
        } catch (error) {
            console.error("Error parsing JSON:", error);
            return res.status(500).json({ message: "Format data tidak valid." });
        }

        const percakapan = dataTraining.percakapan;

        // Cari kecocokan sempurna terlebih dahulu
        const exactResponse = percakapan.find(p => p.input.toLowerCase() === input.toLowerCase());
        if (exactResponse) {
            return res.json({ response: exactResponse.respon });
        }

        // Jika tidak ada kecocokan sempurna, lakukan pencarian mirip menggunakan Fuse.js
        const fuse = new Fuse(percakapan, { keys: ['input'], threshold: 0.4 });  // Threshold dapat diturunkan lebih jauh jika perlu
        const similarResult = fuse.search(input);

        if (similarResult.length > 0) {
            const similarInput = similarResult[0].item.input;
            const similarResponse = similarResult[0].item.respon;

            console.log(`Pertanyaan serupa ditemukan: ${similarInput}`);

            return res.json({ response: similarResponse, similar: similarInput });
        } else {
            return res.json({ response: "Maaf, saya belum tahu jawabannya. Mohon beri saya jawabannya!" });
        }
    });
});

app.post('/learn', (req, res) => {
    const { input, response } = req.body;

    // Pastikan input dan response valid
    if (!input || !response) {
        return res.status(400).json({ message: "Input atau respons tidak boleh kosong" });
    }

    fs.readFile('./otak.json', 'utf8', (err, data) => {
        if (err) {
            console.error("Gagal membaca file:", err);
            return res.status(500).json({ message: "Gagal membaca data." });
        }

        let dataTraining;
        try {
            dataTraining = JSON.parse(data);
        } catch (error) {
            console.error("Error parsing JSON:", error);
            return res.status(500).json({ message: "Format data tidak valid." });
        }

        const percakapan = dataTraining.percakapan;

        // Periksa apakah input sudah ada
        const existingEntry = percakapan.find(item => item.input.toLowerCase() === input.toLowerCase());
        if (existingEntry) {
            existingEntry.respon = response;
            console.log(`Jawaban untuk "${input}" telah diperbarui.`);
        } else {
            percakapan.push({ input, respon: response });
            console.log(`Data baru ditambahkan: ${input} - ${response}`);
        }

        fs.writeFile('./otak.json', JSON.stringify(dataTraining, null, 2), (err) => {
            if (err) {
                console.error("Gagal menulis data:", err);
                return res.status(500).json({ message: "Gagal menyimpan data." });
            }

            console.log("Data berhasil disimpan!");
            res.json({ response: "Terima kasih, saya telah mempelajari jawaban baru!" });
        });
    });
});

// Fungsi untuk mengirim data belajar ke server
function belajar(input, response) {
    fetch('/learn', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            input: input,
            response: response
        })
    })
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.log('Error:', err));
}

// Fungsi untuk bertanya ke bot
function tanyaBot(input) {
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: input })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
    })
    .catch(err => console.log('Error:', err));
}


function tambahPercakapanBaru(input, respon, callback) {
    fs.readFile('./otak.json', 'utf8', (err, data) => {
        if (err) {
            console.error("Gagal membaca file:", err);
            return callback(err);
        }

        let dataTraining;
        try {
            dataTraining = JSON.parse(data);
        } catch (error) {
            console.error("Error parsing JSON:", error);
            return callback(error);
        }

        dataTraining.percakapan.push({ input, respon, kategori: "user_defined" });

        fs.writeFile('./otak.json', JSON.stringify(dataTraining, null, 2), (err) => {
            if (err) {
                console.error("Gagal menulis file:", err);
                return callback(err);
            }
            console.log("Percakapan baru berhasil disimpan!");
            callback(null);
        });
    });
}

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
