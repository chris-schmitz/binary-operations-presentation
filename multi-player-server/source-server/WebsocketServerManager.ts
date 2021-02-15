import WebSocket from "ws"
import http from "http"
import { PlayerController } from "./PlayerController";
import GameManager, { TICK } from "./GameManager";
import { randomByte } from "./helpers/random-byte";
import { clientTypeEnum, messageTypeEnum } from "project-common/Enumerables";

export interface ClientMessage {
  data: WebSocket.Data,
  client: WebSocket
}

interface BrickControllerClient {
  id: Uint8Array,
  socket: WebSocket,
  row: number
}

class WebsocketServerManager {

  private websocketServer: WebSocket.Server
  private _verboseDebugging: boolean = false
  private uuidByteLength = 4

  private gameBoardClients: WebSocket[] = []
  private brickControllerClients: BrickControllerClient[] = []
  private playerControllerClient: PlayerController | null = null
  private touchControllerClient: WebSocket[] = []
  gameManager: GameManager;
  constructor(server: http.Server, gameManager: GameManager, verboseDebugging = false) {
    this.websocketServer = new WebSocket.Server({ server })
    this.gameManager = gameManager
    this._verboseDebugging = verboseDebugging
    this.addListeners()

    console.log("WebsocketManager constructed")

    console.log("Starting brick animation")
    this.gameManager.begin()

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
      console.log("new socket connected")
      socket.on("error", this.handleError)
      socket.on("close", this.handleClose)

      socket.on("message", message => this.handleMessage(message, socket))

      this.gameManager.on(TICK, this.sendGameFrame.bind(this))
    })
  }
  sendGameFrame(frame: Uint8Array) {
    console.log("frame")
    this.sendToAllGameBoards(frame)
    // * inform controllers?
  }
  sendToAllGameBoards(frame: Uint8Array) {
    this.gameBoardClients.forEach(socket => {
      console.log("send")
      socket.send(frame)
    })
  }


  // * Client -> Server message structure:
  // ^         | 7 6 5 4 3 2 1 0 |
  // ^ byte 1: | x x x x x x x x | client type
  // ^ byte 2: | x x x x x x x x | message type
  // ^ byte 3: | x x x x x x x x | UUID
  // ^ byte 4: | x x x x x x x x | UUID
  // ^ byte 5: | x x x x x x x x | UUID
  // ^ byte 6: | x x x x x x x x | UUID
  // ! byte 7: | x x x x x x x x | payload length // consider adding
  // ^ byte n: | ? ? ? ? ? ? ? ? | payload
  private handleMessage(data: WebSocket.Data, socket: WebSocket) {
    console.log("============================")
    console.log("Got a message from a client:")
    console.log(data)

    try {

      if (!(data instanceof Buffer)) {
        // ! Note this check and throw is just b/c I'm making things difficult on myself for this demo. 
        throw new Error("Invalid message data type")
      }

      const { messageType, clientType, payload } = this.parseMessage(data)

      switch (messageType) {
        case messageTypeEnum.REGISTER_CLIENT:
          this.registerClient(clientType, socket)
          break
        case messageTypeEnum.ADD_BRICK:
          console.log("----> BRICK COMMAND!!")

          this.validateClientId(data, socket)
          const client = this.getStoredBrickController(this.getIdFromMessageData(data))
          if (client) {
            this.handleAddBrickCommand(payload, client)
          }
          break

        default:
          console.log(`==> message has unknown messageType: ${messageType} <==`)
          console.log("data:")
          console.log(data)
      }

    } catch (error) {
      console.log("Error in message handling:")
      console.log(error)
      // TODO: come back and standardize errors
      // let errorMessageArray = error.split("")
      // let errorLength = errorMessageArray.length
      // socket.send(Uint8Array.from([
      //   messageTypeEnum.ERROR,
      //   errorLength,
      //   ...errorMessageArray
      // ]))
    }
  }
  validateClientId(data: Buffer, socket: WebSocket) {
    const id = this.getIdFromMessageData(data)
    const storedController = this.getStoredBrickController(id)

    if (!storedController) {
      throw new Error("Unable to find a brick controller with this id.")
    }
    if (storedController.socket !== socket) {
      throw new Error("Stored controller doesn't match the socket that sent the message.")
    }
  }

  // TODO: pull all message data parsing out to it's own utility class
  getIdFromMessageData(data: Buffer) {
    // * with the current message structure, the UUID are 4 the bytes 
    // * starting at index 2 
    return data.slice(2, 6)
  }

  private getStoredBrickController(id: Uint8Array): BrickControllerClient | undefined {
    return this.brickControllerClients
      .find(controller => Buffer.compare(controller.id, id) == 0)
  }


  handleAddBrickCommand(payload: Uint8Array, controller: BrickControllerClient) {
    // * get the row
    // * get the color

    const row = controller.row
    const color = payload

    console.log(`row: ${row}`)
    process.stdout.write(`brick color:`)
    console.log(color)
    this.gameManager.addBrick(row, color)

    // * notify game manager
  }

  private parseMessage(data: Buffer) {
    function extractUuid(data: Buffer, uuidByteLength: number) {
      let buffer = new ArrayBuffer(uuidByteLength)
      let view = new Uint8Array(buffer)
      for (let i = 0; i < uuidByteLength; i++) {
        view[i] = data[i + 2]
      }
      return buffer
    }

    const clientType = data[0] as clientTypeEnum
    const messageType = data[1] as messageTypeEnum

    const uuid = extractUuid(data, this.uuidByteLength)

    // TODO: 
    // * instead of slicing till the end, slice based on the payload size data provided in the value in the data
    const payload = data.slice(2 + this.uuidByteLength)

    if (this._verboseDebugging) {
      console.log("---> message parsing:")

      process.stdout.write("clientType: ")
      console.log(clientTypeEnum[clientType])

      process.stdout.write("messageType: ")
      console.log(messageTypeEnum[messageType])

      process.stdout.write("controllerId: ")
      console.log(uuid)

      process.stdout.write("payload: ")
      console.log(payload)
    }



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
      case clientTypeEnum.BRICK_CONTROLLER:
        console.log("brick controller")
        this.registerBrickController(socket)
        break
      // TODO: touch controller
    }
  }

  private registerBrickController(socket: WebSocket) {
    const id = randomByte(this.uuidByteLength)
    const idView = new Uint8Array(id)

    const row = this.gameManager.getNextRow()
    this.brickControllerClients.push({ id: idView, socket, row })

    console.log("Sending registration information:")
    console.log({ id, row })

    const buffer = new ArrayBuffer(2 + this.uuidByteLength)
    const messageView = new Uint8Array(buffer)

    messageView[0] = messageTypeEnum.CLIENT_REGISTERED
    messageView[1] = row
    for (let i = 0; i < this.uuidByteLength; i++) {
      messageView[i + 2] = idView[i]
    }
    socket.send(messageView)

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

export default WebsocketServerManager