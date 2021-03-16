import { PlayerController } from "./PlayerController";
import WebSocket from "ws";
import { directionEnum, errorTypes, messageTypeEnum } from "../project-common/Enumerables";
import { IdableWebsocket } from "./interfaces/IdableWebsocket";
import { writeFile } from "fs";

export class PlayerControllerManager {

  private playerControllerClient: PlayerController | null = null
  playerId: Uint8Array | undefined;

  constructor() {
    this.createPlayerId()
  }
  createPlayerId() {
    this.playerId = PlayerController.generateId()
    console.log(this.playerId)
    writeFile("./player-id.txt", this.playerId, 'utf8', () => {
      "player id stored"
    })
  }

  public playerMove(socket: IdableWebsocket, payload: Buffer) {
    this.validateSocketInstance(socket)
    // * update player's state based on the movement
    // * call the game manager with the updated player state

    this.playerControllerClient!.move(payload[0] as directionEnum)

    console.log("player move")
    console.log(payload)
  }

  public registerPlayerController(socket: WebSocket, id: Uint8Array) {
    try {
      const idableSocket = socket as IdableWebsocket
      idableSocket.id = id
      this.storePlayerControllerInstance(idableSocket)
      this.notifyPlayer(messageTypeEnum.CLIENT_REGISTERED, this.playerControllerClient!.id)
    } catch (error) {
      console.log(error)
      socket.send(Uint8Array.from([
        messageTypeEnum.ERROR,
        errorTypes.PLAYER_ID_INCORRECT
      ]))
    }
  }
  public notifyPlayer(messageType: messageTypeEnum, payload?: Uint8Array) {
    this.playerControllerClient?.notifyPlayer(messageType, payload)
  }
  private storePlayerControllerInstance(socket: IdableWebsocket) {
    this.validateSocketInstance(socket)
    this.playerControllerClient = new PlayerController(socket);
    this.playerControllerClient.id = socket.id
  }

  private validateSocketInstance(socket: IdableWebsocket) {
    if (!this.playerId) {
      throw new Error("this error should be somewhere else")
    }
    if (Buffer.compare(socket.id, this.playerId) !== 0) {
      throw new Error("incorrect player password")
    }
  }
}