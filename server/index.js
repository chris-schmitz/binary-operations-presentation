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
    console.log(`Got the following message from a websocket client: ${message.readUInt32LE().toString(2)}`)
    // console.log(`Got the following message from a websocket client: ${message.readUInt16LE().toString(2)}`)
    // TODO: how would we parse the buffer?
    // * On a conceptual level, we know that the cap touch controller has 12 bits that represent the state and we're tacking on an additional 8 bit 
    // * type to the front of the number. If we think of the byte array in nibble increments going right to left (little endian) we'd have:
    // ? nibble[0] = first four touch states (bottom row on the touch controller)
    // ? nibble[1] = next four touch states (middle row on the touch controller)
    // ? nibble[2] = next four touch states (top row on the touch controller)
    // ? nibble[3] = first nibble of the touch type
    // ? nibble[4] = last nibble of the touch type
    // ! originally I was thinking "oh we just loop through on a nibble by nibble basis and each iteration evaluate the data". But as I typed that out 
    // ! I realized that's the wrong way of going about it :facepalm:
    // * The nibble info is correct, but I'm thinking to rigidly. 
    // * We know the shape of the buffer coming up: from a little endian perspective we have:
    // ? first 12 bits = touch state
    // ? next 8 bits = message type
    // * So, to parse the message we just need two masks: 
    // ? 0b111111111111 or 0xFFF for the touch state
    // ? 0b11111111 or 0xFF for the message type 
    // * From there we can mask the message for the touch state, store that in a variable, then right shift 12 to get our buffer to the message type and 
    // * use the message mask for that
    



    // socket.send(`got it`)
    const messageType = 0b00000001 // * type: add block
    const data = 0b00000011 // * row index: 3

    let payload = 0
    payload = payload | messageType
    payload = payload << 8
    payload = payload | data
    websocketServer.clients.forEach((client) => {
      client.send(payload)
    })
  })
})
server.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
