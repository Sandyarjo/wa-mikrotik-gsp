const crypto = require('node:crypto');
global.crypto = crypto;


const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const qrcode = require('qrcode-terminal');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

let sock; // Variabel untuk koneksi WhatsApp

// Fungsi untuk mulai koneksi WhatsApp
async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // kita matikan auto-print QR, kita handle manual
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { qr, connection, lastDisconnect } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            console.log('Koneksi terputus. Mencoba sambung ulang...');
            startWhatsApp();
        } else if (connection === 'open') {
            console.log('Terhubung ke WhatsApp!');
        }
    });
}

// Endpoint test
app.get('/', (req, res) => {
    res.send('🚀 API WhatsApp aktif!');
});

// Endpoint kirim pesan
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).send({ status: false, message: 'Number dan message wajib diisi!' });
    }

    try {
        const jid = number + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: message });
        res.send({ status: true, message: 'Pesan berhasil dikirim!' });
    } catch (error) {
        console.error('Gagal kirim pesan:', error);
        res.status(500).send({ status: false, message: 'Gagal kirim pesan', error: error.toString() });
    }
});

// Jalankan server
app.listen(port, () => {
    console.log(`✅ Server jalan di http://localhost:${port}`);
});

// Mulai koneksi WhatsApp
startWhatsApp();
