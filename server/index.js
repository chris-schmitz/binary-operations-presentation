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

    // * The nibble info is correct, but I'm thinking to rigidly. 
    // * We know the shape of the buffer coming up: from a little endian perspective we have:
    // ? first 12 bits = touch state
    // ? next 8 bits = message type
    // * So, to parse the message we just need two masks: 
    // ? 0b111111111111 or 0xFFF for the touch state
    // ? 0b11111111 or 0xFF for the message type 
    // * From there we can mask the message for the touch state, store that in a variable, then right shift 12 to get our buffer to the message type and 
    // * use the message mask for that
    
    let messageData = message.readUInt32LE()

    // TODO move to property constant or module scope constant
    // TODO: add notes
    // ? - number format can be in any base 
    // ? - comes down to readability/preference
    const touchStateMask = 0b111111111111 
    const messageTypeMask = 0xFF

    const messageType = messageData & messageTypeMask 
    messageData >>= 8 // * we've already grabbed the type information, so right shifting and losing the bits is fine

    const touchState = messageData 


    let payload = 0
    payload = payload | messageType
    payload <<= 8
    payload = payload | touchState
    websocketServer.clients.forEach((client) => {
      client.send(payload)
    })
  })
})
server.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
