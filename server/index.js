const http = require('http')
const express = require('express')
const WebSocket = require('ws')

const PORT = 3001
const app = express()
app.use(express.static('public'))
const server = http.createServer(app)
const websocketServer = new WebSocket.Server({ server })

function relayMessageToClients(message) {
  if (message instanceof Number) {
    // * we're only sending numbers up from the touch controller
    // * and we know we're storing those binary numbers in Little Endian form:
    // ? https://en.wikipedia.org/wiki/Endianness
    // ? https://www.youtube.com/watch?v=WBA6svOyWb8
    const message = message.readUInt32LE()
  }

  console.log(message)

  websocketServer.clients.forEach((client) => {
    client.send(message)
  })
}

websocketServer.on('connection', (socket) => {
  console.log('new client connected. Clients: ')
  console.log(websocketServer.clients)

  socket.on('message', relayMessageToClients)
})
server.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
