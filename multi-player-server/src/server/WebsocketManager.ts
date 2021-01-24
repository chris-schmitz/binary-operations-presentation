import WebSocket from "ws"
import http from "http"
import { EventEmitter } from "events";

// enum messageType {
//   GAME_STATE_FRAME = 0x01,

// }

export interface ClientMessage {
  data: WebSocket.Data,
  client: WebSocket
}

class WebsocketManager extends EventEmitter {

  private websocketServer: WebSocket.Server
  constructor(server: http.Server) {
    super()
    this.websocketServer = new WebSocket.Server({ server })
    this.addListeners()

  }

  // TODO: come back and define the specific message types
  public sendToAllClients(message: any) {
    console.log(`Sending message to all clients: ${message}`)
    this.websocketServer.clients.forEach(client => {
      client.send(message)
    })
  }


  private addListeners() {
    this.websocketServer.on("connection", (socket) => {
      this.emit("socket-connected")
      console.log("new socket connected")
      socket.on("error", this.handleError)
      socket.on("close", this.handleClose)

      socket.on("message", message => this.handleMessage(message, socket))
    })
  }

  private handleMessage(data: WebSocket.Data, socket: WebSocket) {
    console.log("Got a message from a client:")
    console.log(data)

    const payload: ClientMessage = { data, client: socket }
    this.emit("client-message", payload) // * and now when we fire `this.emit`, it's from the WebsocketManager
  }

  private handleClose(code: number, reason: string) {
    console.log(`Socket closed connection\ncode: ${code}\nreason: ${reason}`)
  }

  private handleError(error: Error) {
    console.error("!!! A socket had an error !!!")
    console.log(error)
  }

}

export default WebsocketManager