import WebSocket from "ws"
import http from "http"
import { EventEmitter } from "events";

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
    this.websocketServer.clients.forEach(client => {
      client.send(message)
    })
  }

  private addListeners() {
    this.websocketServer.on("connection", (socket) => {
      console.log("new socket connected")
      socket.on("error", this.handleError)
      socket.on("close", this.handleClose)
      socket.on("message", this.handleMessage)
    })
  }

  private handleMessage(data: WebSocket.Data) {
    console.log("Got a message:")
    console.log(data)
    const client = this
    this.emit("client-message", { data, client })
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