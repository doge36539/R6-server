const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

let players = {};
// We will store broken walls here so late-joiners see the destruction!
let brokenPlanks = []; 

io.on('connection', (socket) => {
    console.log('Player connected: ' + socket.id);
    
    players[socket.id] = { x: 0, y: 1.8, z: 0, ry: 0, rx: 0, stance: 'stand' };
    socket.emit('currentPlayers', players);
    socket.emit('worldState', brokenPlanks); // Send the broken walls to the new guy
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // 1. Sync Movement & Looking
    socket.on('playerMovement', (data) => {
        players[socket.id] = data;
        socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
    });

    // 2. Sync Shooting
    socket.on('shoot', (data) => {
        socket.broadcast.emit('enemyShoot', { id: socket.id, ...data });
    });

    // 3. Sync Barricade Destruction
    socket.on('breakWood', (data) => {
        brokenPlanks.push(data);
        socket.broadcast.emit('woodBroken', data);
    });

    // 4. Sync Barricade Deploying
    socket.on('deployDoor', (bIdx) => {
        // Remove repaired planks from the broken list
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
