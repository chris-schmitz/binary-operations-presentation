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
    message = message.readUInt32LE()
  }

  console.log('Relaying the following message to all clients:')
  console.log(message)

  websocketServer.clients.forEach((client) => {
    client.send(message, { binary: true }, (error) => {
      if (!error) return
      console.log('Error sending message:')
      console.log(error)
    })
  })
}

websocketServer.on('connection', (socket) => {
  socket.binaryType = 'arraybuffer'
  console.log('new client connected. Current active connections:')
  console.log(websocketServer.clients)

  socket.on('message', relayMessageToClients)
})
server.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
