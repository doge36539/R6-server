const express = require('express');
const app = express();
const http = require('http').createServer(app);
// CORS is required so your browser game is allowed to talk to this server!
const io = require('socket.io')(http, { cors: { origin: "*" } });

let players = {};

io.on('connection', (socket) => {
    console.log('Player connected: ' + socket.id);
    
    // Spawn the player and send them to everyone else
    players[socket.id] = { x: 0, y: 1.8, z: 0, ry: 0 };
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // When the player moves, update the lobby
    socket.on('playerMovement', (data) => {
        players[socket.id] = data;
        socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
    });

    // Clean up when they close the tab
    socket.on('disconnect', () => {
        console.log('Player disconnected: ' + socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
