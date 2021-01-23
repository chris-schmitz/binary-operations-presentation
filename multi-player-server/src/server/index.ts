import express from "express"
import WebSocket from "ws"
import http from "http"

// TODO: ripout consideration
// * I'm adding express here, but tbh I don't know that I'll need it.
// * I'm leaving it in in case I want rest enpoints, but if this ends up being all 
// * websockets and a static page and maybe a simple ajax request or two, considerer
// * ripping out express
const app = express()
const server = http.createServer(app)

const port = 3000

const webSocketServer = new WebSocket.Server({server})
webSocketServer.on("connection", (socket) => {
  console.log("socket connected")
  socket.on("message", (message) => websocketMessageHandler(message, socket))
})

const websocketMessageHandler = (message: WebSocket.Data, socket: WebSocket) =>{
  console.log("new message:")
  console.log(message)

  socket.send("heya")
}

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})