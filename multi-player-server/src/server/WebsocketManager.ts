import WebSocket from "ws"
import http from "http"
import { EventEmitter } from "events";
import { v4 as uuid } from "uuid";

enum messageTypeEnum {
  REGISTER_CLIENT = 0x04,
  CONTROLLER_COMMAND,
  GAME_FRAME
}

enum clientTypeEnum {
  GAMEBOARD = 0x01,
  BRICK_CONTROLLER,
  PLAYER_CONTROLLER,
  TOUCH_CONTROLLER
}

export interface ClientMessage {
  data: WebSocket.Data,
  client: WebSocket
}

class PlayerController {
  private _id: string
  private socket: WebSocket


  constructor(socket: WebSocket) {
    this.socket = socket
    this._id = this.generateId()
  }

  generateId() {
    return uuid()
  }

  get id() {
    return this._id
  }
}

class WebsocketManager extends EventEmitter {

  private websocketServer: WebSocket.Server
  private _verboseDebugging: boolean = false

  private gameBoardClients: WebSocket[] = []
  private brickControllerClients: WebSocket[] = []
  private playerControllerClient: PlayerController | null = null
  private touchControllerClient: WebSocket[] = []
  constructor(server: http.Server, verboseDebugging = false) {
    super()
    this.websocketServer = new WebSocket.Server({ server })
    this._verboseDebugging = verboseDebugging
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
    if (data instanceof Buffer) {
      const { messageType, clientType, payload } = this.parseMessage(data)
      switch (messageType) {
        case messageTypeEnum.REGISTER_CLIENT:
          this.registerClient(clientType, socket)
          break
        case messageTypeEnum.CONTROLLER_COMMAND:
          this.handleControllerCommand(clientType, payload)
          break
        default:
          console.log(`!!! message has unknown messageType: ${messageType} !!!`)
          console.log("data:")
          console.log(data)
      }
    } else {
      console.log("Incorrect data type")
      console.log(typeof data)
    }

    // * Message structure:
    // ^         | 7 6 5 4 3 2 1 0 |
    // ^ byte 1: | x x x x m m c c | where `m` is messageType and `c` is clientType
    // ^ byte n: | ? ? ? ? ? ? ? ? | the rest of the data, no specific length atm (though should we add one? does it matter?)
    // ^ ]
    // * If it doesn't fit this format, reject with error message



    const payload: ClientMessage = { data, client: socket }
    this.emit("client-message", payload) // * and now when we fire `this.emit`, it's from the WebsocketManager
  }
  handleControllerCommand(clientType: number, payload: Buffer) {
    // * if it's a player controller and payload has correct controller id/password/whatever, tell game manager to update player position
    // * if it's the brick controller, grab the row number from the payload and tell game manager to update
  }

  private parseMessage(data: Buffer) {

    function getClientType(byte: number): clientTypeEnum {
      const clientMask = 0b00000011
      return clientMask & byte
    }

    function getMessageType(byte: number) {
      const messageMask = 0b001100
      return messageMask & byte
    }

    console.log("---> message parsing!!:")

    let firstByte = data.slice(0, 7)[0]

    if (this._verboseDebugging) {
      process.stdout.write("firstByte: ")
      console.log(firstByte.toString(2))
    }

    const clientType = getClientType(firstByte)

    if (this._verboseDebugging) {
      process.stdout.write("clientType: ")
      console.log(clientTypeEnum[clientType])
    }


    const messageType = getMessageType(firstByte)

    if (this._verboseDebugging) {
      process.stdout.write("messageType: ")
      console.log(messageTypeEnum[messageType])
    }


    const payload = data.slice(2)

    return { clientType, messageType, payload }
  }

  private registerClient(type: clientTypeEnum, socket: WebSocket) {
    console.log("")
    console.log("--> registering client type:")
    switch (type) {
      case clientTypeEnum.GAMEBOARD:
        console.log("gameboard")
        this.registerGameBoard(socket);
        break
      case clientTypeEnum.PLAYER_CONTROLLER:
        console.log("player controller");
        this.registerPlayerController(socket);
        break
      // TODO: touch controller
      // TODO: brick controller
    }
  }

  private registerGameBoard(socket: WebSocket) {
    this.gameBoardClients.push(socket);
  }

  private registerPlayerController(socket: WebSocket) {
    if (this.playerControllerClient !== null) { // TODO: add "... or if the id of the client trying to register is not the id of the client we already have -> error"
      console.log("!! =============================================================== !!")
      console.log("A controller client is attempting to register but we already have one")
      socket.send("Forbidden: A controller is already registered")
      console.log("!! =============================================================== !!")
    }
    this.playerControllerClient = new PlayerController(socket);
    console.log(this.playerControllerClient.id);
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