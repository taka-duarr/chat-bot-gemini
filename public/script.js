document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('user-input');
    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });
});

let pendingResponse = null; // Variabel global untuk menyimpan respons mirip yang menunggu konfirmasi

async function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    if (!userInput) return;

    const chatBox = document.getElementById('chat-box');

    // Tambahkan pesan pengguna
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message user flex justify-end mb-4';
    const userContent = document.createElement('div');
    userContent.className = 'bg-blue-500 text-white p-3 rounded-lg max-w-xs shadow-lg';
    userContent.textContent = userInput;
    userMessage.appendChild(userContent);
    chatBox.appendChild(userMessage);

    // Simpan input pengguna untuk pembelajaran jika diperlukan
    pendingInput = userInput;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input: userInput })
        });

        if (!response.ok) throw new Error("Server error!");

        const data = await response.json();

        // Jika ada hasil mirip, tampilkan bubble chat konfirmasi
        if (data.similar) {
            pendingResponse = data.response; // Simpan respons mirip

            // Tampilkan pesan konfirmasi untuk pengguna
            const similarMessage = document.createElement('div');
            similarMessage.className = 'chat-message bot flex justify-start mb-4';
            const similarContent = document.createElement('div');
            similarContent.className = 'bg-gray-200 text-gray-800 p-3 rounded-lg max-w- shadow-lg';
            similarContent.textContent = `Mungkin Maksud Anda: "${data.similar}"`;
            similarMessage.appendChild(similarContent);
            chatBox.appendChild(similarMessage);

            // Tambahkan opsi "Iya" dan "Tidak" sebagai tombol
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'flex space-x-2 mt-2';
            
            const yesButton = document.createElement('button');
            yesButton.textContent = "Iya";
            yesButton.className = 'bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600';
            yesButton.onclick = () => confirmResponse(true);
            
            const noButton = document.createElement('button');
            noButton.textContent = "Tidak";
            noButton.className = 'bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600';
            noButton.onclick = () => confirmResponse(false);

            buttonContainer.appendChild(yesButton);
            buttonContainer.appendChild(noButton);
            chatBox.appendChild(buttonContainer);
        } else {
            // Jika tidak ada respons mirip atau jawaban belum diketahui
            if (data.response.includes("Maaf, saya belum tahu jawabannya")) {
                // Tampilkan prompt untuk meminta input jawaban dari pengguna
                const userResponse = prompt("Bot belum tahu jawabannya. Mohon masukkan jawaban untuk pertanyaan ini:");
                if (userResponse) {
                    await fetch('/learn', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ input: userInput, response: userResponse })
                    });
                    displayBotMessage("Terima kasih, saya telah mempelajari jawaban baru!");
                }
            } else {
                displayBotMessage(data.response);
            }
        }
    } catch (error) {
        console.error("Error:", error);
        displayBotMessage("Maaf, terjadi kesalahan.");
    }

    document.getElementById('user-input').value = '';
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Fungsi untuk menangani konfirmasi "Iya" atau "Tidak"
function confirmResponse(isConfirmed) {
    const chatBox = document.getElementById('chat-box');
    if (isConfirmed) {
        // Jika pengguna memilih "Iya", tambahkan respons mirip ke chat
        displayBotMessage(pendingResponse);
    } else {
        // Jika pengguna memilih "Tidak", beri tahu bot
        // displayBotMessage("Baik, saya tidak akan menganggapnya sebagai jawaban.");

        // Menyediakan opsi untuk memasukkan jawaban baru untuk belajar
        const userResponse = prompt("Bot belum tahu jawabannya. Mohon masukkan jawaban untuk pertanyaan ini:");
        if (userResponse) {
            // Kirim data untuk disimpan di backend dan diajarkan kepada bot
            fetch('/learn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ input: pendingInput, response: userResponse })
            }).then(() => {
                displayBotMessage("Terima kasih, saya telah mempelajari jawaban baru!");
            }).catch(() => {
                displayBotMessage("Maaf, terjadi kesalahan saat menyimpan jawaban.");
            });
        }
    }

    // Setelah konfirmasi, hapus tombol dan pesan konfirmasi
    const buttonContainer = chatBox.querySelector('.flex.space-x-2.mt-2');
    if (buttonContainer) buttonContainer.remove();

    // Lanjutkan dengan input baru
    document.getElementById('user-input').value = '';
}

// Fungsi untuk menampilkan pesan bot di dalam bubble chat
function displayBotMessage(message) {
    const chatBox = document.getElementById('chat-box');
    const botMessage = document.createElement('div');
    botMessage.className = 'chat-message bot flex justify-start mb-4';
    const botContent = document.createElement('div');
    botContent.className = 'bg-gray-200 text-gray-800 p-3 rounded-lg max-w-full shadow-lg whitespace-pre-wrap';
    
    // Proses teks sebelum ditampilkan (konversi markdown-like ke HTML)
    botContent.innerHTML = formatBotText(message);
    
    botMessage.appendChild(botContent);
    chatBox.appendChild(botMessage);
}


async function handleUserResponse(input, isYes) {
    const chatBox = document.getElementById('chat-box');
    if (isYes) {
        const responseMessage = document.createElement('div');
        responseMessage.className = 'chat-message bot';
        const responseContent = document.createElement('div');
        responseContent.className = 'message-content';
        responseContent.textContent = "Bot: Terima kasih, saya akan mengingat jawaban tersebut.";
        responseMessage.appendChild(responseContent);
        chatBox.appendChild(responseMessage);
        
        // Mengirimkan bahwa pengguna menyetujui jawaban mirip
        await fetch('/learn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input, response: "Jawaban yang benar." })
        });
    } else {
        const responseMessage = document.createElement('div');
        responseMessage.className = 'chat-message bot';
        const responseContent = document.createElement('div');
        responseContent.className = 'message-content';
        responseContent.textContent = "Bot: Terima kasih, saya akan mencari jawaban lain.";
        responseMessage.appendChild(responseContent);
        chatBox.appendChild(responseMessage);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

const chatBox = document.getElementById("chat-box");

// Fungsi untuk menambahkan pesan ke chat box
// Fungsi untuk menambahkan pesan ke chat box dengan Tailwind styling
function addMessage(content, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("flex", "mb-2");

    if (sender === "user") {
        messageDiv.classList.add("justify-end");
        messageDiv.innerHTML = `<div class="bg-blue-500 text-white p-3 rounded-lg max-w-full shadow-lg">${content}</div>`;
    } else if (sender === "bot") {
        messageDiv.classList.add("justify-start");
        messageDiv.innerHTML = `<div class="bg-gray-200 text-gray-800 p-3 rounded-lg max-w-full shadow-lg">${content}</div>`;
    } else if (sender === "confirm") {
        messageDiv.classList.add("justify-start");
        messageDiv.innerHTML = `
            <div class="flex space-x-2 mt-2">
                <button onclick="handleConfirmation('iya')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Iya</button>
                <button onclick="handleConfirmation('tidak')" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Tidak</button>
            </div>`;
    }

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Fungsi untuk menangani jawaban konfirmasi
let pendingAnswer = null;
function handleConfirmation(answer) {
    if (answer === 'iya' && pendingAnswer) {
        addMessage(pendingAnswer, "bot");
        // Simpan jawaban yang dikonfirmasi
        fetch('/learn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: pendingAnswer.input,
                response: pendingAnswer.respon
            })
        }).then(() => {
            console.log("Jawaban telah diperbarui.");
        }).catch(err => {
            console.log("Error saat menyimpan:", err);
        });
    } else if (answer === 'tidak') {
        addMessage("Baik, silakan berikan jawaban yang benar untuk saya pelajari.", "bot");
    }
    pendingAnswer = null; // Reset jawaban pending
}

function formatBotText(text) {
    // Blok kode (multiline)
    text = text.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 text-white p-2 rounded overflow-auto"><code>$1</code></pre>');
    
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-300 px-1 rounded">$1</code>');

    // Bold **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    return text;
}
