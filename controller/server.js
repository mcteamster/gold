// HTTP and WebSocket Server
const WebSocket = require('ws');
const express = require('express');
const ws = new WebSocket.Server({ noServer: true });
const app = express();
const server = app.listen(80);
server.on('upgrade', (request, socket, head) => {
    ws.handleUpgrade(request, socket, head, socket => {
        ws.emit('connection', socket, request);
    });
});
app.use(express.static("../view/build"));

// Model
const Lobby = require("../model/lobby.js");
lobbies = [];
rooms = [];

// Websocket Controller
ws.on('connection', function (socket) {
    // Send a meta-only game state to induce Landing page
    socket.send(JSON.stringify({
        meta: {
            type: "gameState",
            round: 0,
            turn: 0,
            phase: "setup",
            card: 0,
            score: 0
        } 
    }));

    // 1. Process inputs
    socket.on('message', function (msg) {
        // Expect roomID, playerID, clientSecret, and data
        msg = JSON.parse(msg);

        // Lobby Init
        if (!this.lobby) {
            let room = parseInt(msg.roomID);
            if (room > 999 && rooms.indexOf(room) != -1) {
                // Lookup Lobby and Retrieve
                let l = lobbies.find(l => l.roomID == room);
                if (l) {
                    this.lobby = l;
                    this.lobby.sockets.push(socket); // Join Broadcast
                                        
                    // Rejoining Logic
                    if (this.lobby.gs.meta.phase === "play") {
                        if (this.lobby.checkPlayer(msg)) {
                            socket.send(JSON.stringify(this.lobby.gs));
                            return;
                        } else {
                            socket.send(JSON.stringify({ meta: { type: "error", data: "This game has already started, would you like to spectate?" } }));
                            return;
                        }
                    }
                } else {
                    socket.send(JSON.stringify({ meta: { type: "error", data: "Room is missing, game may no longer be in progress." } }));
                    return;
                }
            } else if(!isNaN(room)) {
                socket.send(JSON.stringify({ meta: { type: "error", data: "Room is missing, game may no longer be in progress.", code: "missingRoom" } }));
                return;
            } else {
                // Make a New Lobby!
                let retries = 0;
                while (retries < 10) {
                    room = Math.floor(Math.random()*1000 + 1000); // RNG a room Number
                    if (rooms.indexOf(room) == -1) {
                        let l = new Lobby(room);
                        this.lobby = l;
                        this.lobby.sockets.push(socket);
                        lobbies.push(l);
                        rooms.push(room); 
                        break;
                    } else {
                        retries++;
                    }
                }
                if (retries >= 10) {
                    socket.send(JSON.stringify({ meta: { type: "error", data: "Could not start a room, please try again later." } }));
                    return;
                }
            }
        }

        // Authenticate against the lobby
        let authed = this.lobby.auth(msg);

        // Switch depending on Game Phase
        switch (this.lobby.gs.meta.phase) {
            case "setup":
                if (authed && msg.playerID === "1" && msg.data === "start") {
                    this.lobby.gs.meta.phase = "play"; // Host can start the game 
                    this.lobby.gs.meta.turntime = 30000; // Set Turn Timer TODO Customise
                    tick(this.lobby, this.lobby.gs.meta.turntime);
                } else if (this.lobby.checkPlayer(msg) == true) {
                    socket.send(JSON.stringify({ meta: { type: "rejoin", data: "Welcome Back" } }))
                } else if(this.lobby.players.find(x => (x.name === msg.data))) {
                    // Error on Name Colissions
                    socket.send(JSON.stringify({ meta: { type: "error", data: "Someone has already taken that name!", code: "takenName" } }));
                    return;
                } else {
                    socket.send(JSON.stringify(this.lobby.addPlayer(msg))); // Add player to the lobby and return secret
                }
                this.lobby.sockets.forEach(s => s.send(JSON.stringify(this.lobby.gs))); // Broadcast Updates
                break;
            case "play":
                // Collect intent from all players until time is up
                if (authed) {
                    let voted = this.lobby.gs.setIntent(msg);
                    let allVoted = this.lobby.gs.getActive().map((p) => {
                        return voted[p.id];
                    }).reduce((x, y) => 
                        {return x && y}
                    );
                    if(allVoted) {
                        // Proceed Early if All Players have explictly voted
                        clearTimeout(this.lobby.nextTurn);
                        nextTurn(this.lobby);
                    } else {
                        // Brodcast Vote Status Updates
                        this.lobby.sockets.forEach(s => s.send(JSON.stringify({ meta: { type: "readyStatus", data: voted } }))); // Broadcast Updates
                    }
                }
                break;
            case "endgame":
                break;
            default:
                break;
        }
    });

    socket.on('close', () => {
        if (this.lobby) { this.lobby.sockets = this.lobby.sockets.filter(s => s !== socket); }
    });
});

// 2. Gameplay Loop: Update Game State and Publish When Time is Up
function tick(lobby, timeout) {
    lobby.nextTurn = setTimeout(()=>{nextTurn(lobby)}, timeout);
}

function nextTurn(lobby) {
    if (lobby.gs.meta.phase === "play") {
        lobby.gs.update();
        tick(lobby, lobby.gs.meta.turntime);
    } else if (lobby.gs.meta.phase === "endgame") {
        console.debug(new Date() + ` Game ${lobby.gs.meta.room} is Over`);
        rooms = rooms.filter(r => r != lobby.roomID);
        lobbies = lobbies.filter(l => l !== lobby);
    }
    // Broadcast Update
    lobby.sockets.forEach(s => s.send(JSON.stringify(lobby.gs)));
}

// 3. Cleanup abandoned lobbies
setInterval(()=>{
    lobbies.forEach(lobby => {
        let age = new Date() - lobby.creationTime;
        if(age > 1000*60*60){
            console.debug(new Date() + ` Cleaned ${lobby.roomID}`);
            rooms = rooms.filter(r => r != lobby.roomID);
            lobbies = lobbies.filter(l => l !== lobby);
        }
    })
}, 1000*60*10)

// Welcome to the Game
console.info(new Date() + " Welcome to Drinkin' Gold")