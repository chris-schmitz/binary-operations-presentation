const http = require('http')

const express = require('express')

const WebSocket = require('ws')

const PORT = 3001

const app = express()

app.use(express.static('public'))

const server = http.createServer(app)

const websocketServer = new WebSocket.Server({ server })

websocketServer.on('connection', (socket) => {
  console.log(websocketServer.clients)
  socket.on('message', (message) => {
    websocketServer.clients.forEach((client) => {
      client.send(message)
    })
  })
})
server.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
