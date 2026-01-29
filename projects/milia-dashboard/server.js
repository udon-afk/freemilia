const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// System monitoring simulation
setInterval(() => {
    const stats = {
        cpu: (Math.random() * 100).toFixed(1),
        memory: (1 - os.freemem() / os.totalmem()).toFixed(2) * 100,
        uptime: os.uptime(),
        timestamp: new Date().toLocaleTimeString()
    };
    io.emit('stats', stats);
}, 2000);

io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Milia Dashboard running at http://localhost:${PORT}`);
});
