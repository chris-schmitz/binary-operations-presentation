import WebSocket from "ws"
import http from "http"
import { PlayerController } from "./PlayerController";
import GameManager, { TICK } from "./GameManager";
import { clientTypeEnum, messageTypeEnum } from "../project-common/Enumerables";
import { BrickControllerManager } from "./BrickControllerManager"
import { PlayerControllerManager } from "./PlayerControllerManager";
import { BrickControllerClient } from "./interfaces/BrickControllerClient";
import { IdableWebsocket } from "./interfaces/IdableWebsocket";
import { SocketError } from "./errors/SocketError";



class WebsocketServer {

  private websocketServer: WebSocket.Server
  private _verboseDebugging: boolean = false
  private uuidByteLength = 4

  private gameBoardClients: WebSocket[] = []
  // private playerControllerClient: PlayerController | null = null
  private touchControllerClient: WebSocket[] = []
  private gameManager: GameManager;

  brickControllerManager: BrickControllerManager;
  playerControllerManager: PlayerControllerManager;

  constructor(server: http.Server, gameManager: GameManager, brickControllerManager: BrickControllerManager, playerControllerManager: PlayerControllerManager, verboseDebugging = false) {
    this.websocketServer = new WebSocket.Server({ server })
    this.gameManager = gameManager
    this.brickControllerManager = brickControllerManager
    this.playerControllerManager = playerControllerManager
    this._verboseDebugging = verboseDebugging
    console.log("adding game manager listener")
    // TODO: move back to listeners

    this.addListeners()

    console.log("WebsocketManager constructed")
    console.log("Starting brick animation")

    this.gameManager.begin()

  }

  // TODO: come back and define the specific message types
  public sendToAllClients(message: any) {
    console.log(`Sending message to all clients: ${message}`)

    // TODO: refactor consideration?
    // * if we end up pulling all client managers out to named classes, should this become a message 
    // * to each manager to relay the message to their clients?
    this.websocketServer.clients.forEach(client => {
      client.send(message)
    })
  }

  private addListeners() {
    this.gameManager.on(TICK, this.sendGameFrame.bind(this))
    this.gameManager.on(TICK, this.sendGameTick.bind(this))

    this.websocketServer.on("connection", (socket) => {
      console.log("new socket connected")
      socket.on("error", this.handleError.bind(this))
      socket.on("close", (code, reason) => {
        this.handleClose(socket, code, reason)
      })

      socket.on("message", message => this.handleMessage(message, socket))
    })
  }
  sendGameFrame(frame: Uint8Array) {
    this.sendToAllGameBoards(frame)
  }
  sendGameTick() {
    this.websocketServer.clients.forEach(client => client.send(Uint8Array.from([messageTypeEnum.GAME_TICK])))
  }
  sendToAllGameBoards(frame: Uint8Array) {
    this.gameBoardClients.forEach(socket => {
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

      const { messageType, clientType, payload, id } = this.parseMessage(data)

      switch (messageType) {
        case messageTypeEnum.REGISTER_CLIENT:
          this.registerClient(clientType, socket, id)
          break
        case messageTypeEnum.ADD_BRICK:
          // TODO move validation here
          this.addBrickToGameBoard(data, socket, payload);
          break
        case messageTypeEnum.PLAYER_MOVE:
          this.playerControllerManager.playerMove(socket as IdableWebsocket, payload)
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
  private addBrickToGameBoard(data: Buffer, socket: WebSocket, payload: Buffer) {
    console.log("----> BRICK COMMAND!!");
    this.validateClientId(data, socket);
    const client = this.brickControllerManager.getControllerById(this.getIdFromMessageData(data));
    if (!client) {
      throw new Error("can't find client by id")
    }
    this.handleAddBrickCommand(payload, client);
  }

  private validateClientId(data: Buffer, socket: WebSocket) {
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

  private getStoredBrickController(id: Uint8Array): BrickControllerClient | null {
    return this.brickControllerManager.getControllerById(id) || null
  }


  handleAddBrickCommand(payload: Uint8Array, controller: BrickControllerClient) {
    // * get the row
    // * get the color

    const row = controller.row
    const color = payload

    console.log(`row: ${row}`)
    process.stdout.write(`brick color:`)
    console.log(color)
    if (!row) {
      throw new SocketError(controller.socket, "You don't have a row assigned so you can't send a brick command. ")
    }

    this.gameManager.addBrick(row, color)
  }

  // TODO: woof, this is a bit of a mess at the moment. come back and clean this up
  private parseMessage(data: Buffer) {
    function extractUuid(data: Buffer, uuidByteLength: number) {
      let buffer = new ArrayBuffer(uuidByteLength)
      let view = new Uint8Array(buffer)
      for (let i = 0; i < uuidByteLength; i++) {
        view[i] = data[i + 2]
      }
      return view
    }

    const clientType = data[0] as clientTypeEnum
    const messageType = data[1] as messageTypeEnum

    const id = extractUuid(data, this.uuidByteLength)

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
      console.log(id)

      process.stdout.write("payload: ")
      console.log(payload)
    }

    return { clientType, messageType, payload, id }
  }

  private registerClient(type: clientTypeEnum, socket: WebSocket, id: Uint8Array) {
    console.log("")
    console.log("--> registering client type:")
    switch (type) {
      case clientTypeEnum.GAMEBOARD:
        console.log("gameboard")
        this.registerGameBoard(socket);
        break
      case clientTypeEnum.PLAYER_CONTROLLER:
        console.log("player controller");
        this.playerControllerManager.registerPlayerController(socket, id);
        break
      case clientTypeEnum.BRICK_CONTROLLER:
        console.log("brick controller")
        this.brickControllerManager.registerBrickController(socket, this.uuidByteLength)
        break
      // TODO: touch controller
    }
  }

  private registerGameBoard(socket: WebSocket) {
    this.gameBoardClients.push(socket);
  }


  private handleClose(socket: WebSocket, code: number, reason: string) {
    const idableSocket = socket as IdableWebsocket
    console.log(`Socket closed connection\ncode: ${code}\nreason: ${reason}`)
    this.brickControllerManager.handleClientDisconnect(idableSocket)
  }

  private handleError(error: Error) {
    console.error("!!! A socket had an error !!!")
    console.log(error)
  }

}

export default WebsocketServer