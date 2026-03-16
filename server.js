const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

let players = {};
let brokenPlanks = []; // Stores broken wood for late-joiners

io.on('connection', (socket) => {
    console.log('Player connected: ' + socket.id);
    
    players[socket.id] = { x: 0, y: 1.8, z: 0, ry: 0, rx: 0, stance: 'stand' };
    socket.emit('currentPlayers', players);
    socket.emit('worldState', brokenPlanks); 
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    socket.on('playerMovement', (data) => {
        players[socket.id] = data;
        socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
    });

    socket.on('shoot', (data) => {
        socket.broadcast.emit('enemyShoot', { id: socket.id, ...data });
    });

    socket.on('breakWood', (data) => {
        brokenPlanks.push(data);
        socket.broadcast.emit('woodBroken', data);
    });

    socket.on('deployDoor', (bIdx) => {
        brokenPlanks = brokenPlanks.filter(p => p.bIdx !== bIdx);
        socket.broadcast.emit('doorDeployed', bIdx);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

http.listen(process.env.PORT || 3000, () => {
    console.log('Action Server is LIVE.');
});
