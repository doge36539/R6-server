const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

let lobbies = {}; // Tracks active matches

io.on('connection', (socket) => {
    console.log('Player connected to Hub: ' + socket.id);

    // 1. Send the list of servers to the Server Browser
    socket.on('requestServers', () => {
        const serverList = Object.keys(lobbies).map(id => ({
            id: id,
            name: lobbies[id].name,
            players: lobbies[id].players.length
        }));
        socket.emit('serverList', serverList);
    });

    // 2. Handle joining/creating a match
    socket.on('joinMatch', (lobbyId) => {
        // If they clicked Quick Match (null), find or make "Auto-Match #1"
        if (!lobbyId || !lobbies[lobbyId]) {
            lobbyId = 'lobby_1';
            if (!lobbies[lobbyId]) lobbies[lobbyId] = { name: "Auto-Match #1", players: [] };
        }
        
        socket.join(lobbyId);
        lobbies[lobbyId].players.push(socket.id);
        socket.currentLobby = lobbyId;

        // Tell the client they successfully connected to the room!
        socket.emit('matchJoined', lobbyId);
        
        // Update the server browser for anyone else looking at the menu
        io.emit('serverList', Object.keys(lobbies).map(id => ({
            id: id, name: lobbies[id].name, players: lobbies[id].players.length
        })));
    });

    // 3. Clean up empty servers when people leave
    socket.on('disconnect', () => {
        if (socket.currentLobby && lobbies[socket.currentLobby]) {
            lobbies[socket.currentLobby].players = lobbies[socket.currentLobby].players.filter(id => id !== socket.id);
            // Destroy lobby if empty so it disappears from the Server Browser
            if (lobbies[socket.currentLobby].players.length === 0) {
                delete lobbies[socket.currentLobby];
            }
            // Broadcast the new list
            io.emit('serverList', Object.keys(lobbies).map(id => ({
                id: id, name: lobbies[id].name, players: lobbies[id].players.length
            })));
        }
    });
});

http.listen(process.env.PORT || 3000, () => { console.log('Matchmaking Server LIVE.'); });
