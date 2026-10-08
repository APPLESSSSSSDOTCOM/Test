const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const players = new Map();

const server = http.createServer((request, response) => {
  let file = request.url === "/" ? "index.html" : request.url.slice(1);
  file = path.join(__dirname, file);

  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("File not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": "text/html"
    });

    response.end(data);
  });
});

const webSocketServer = new WebSocket.Server({ server });

function sendPlayers() {
  const message = JSON.stringify({
    type: "players",
    players: [...players.values()]
  });

  webSocketServer.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

webSocketServer.on("connection", socket => {
  const id = crypto.randomUUID();

  const player = {
    id,
    x: 400,
    y: 250,
    color: `hsl(${Math.random() * 360}, 80%, 60%)`
  };

  players.set(id, player);

  socket.send(JSON.stringify({
    type: "welcome",
    id
  }));

  sendPlayers();

  socket.on("message", message => {
    try {
      const data = JSON.parse(message);
      const currentPlayer = players.get(id);

      if (!currentPlayer) return;

      if (data.type === "move") {
        const speed = 5;

        if (data.up) currentPlayer.y -= speed;
        if (data.down) currentPlayer.y += speed;
        if (data.left) currentPlayer.x -= speed;
        if (data.right) currentPlayer.x += speed;

        currentPlayer.x = Math.max(25, Math.min(775, currentPlayer.x));
        currentPlayer.y = Math.max(25, Math.min(475, currentPlayer.y));

        sendPlayers();
      }
    } catch {
      console.log("Invalid message received");
    }
  });

  socket.on("close", () => {
    players.delete(id);
    sendPlayers();
  });
});

server.listen(PORT, () => {
  console.log(`Game running on port ${PORT}`);
});
