import { writeFile } from "fs";
import { join } from "path";
import WebSocket from "ws";
import { idByteLength } from "../../project-common/config.json";
import { directionEnum, errorTypes, messageTypeEnum } from "../../project-common/Enumerables";
import { uintArrayToHex } from "../helpers/number-tools";
import { IdableWebsocket, IdableWebsocketTypeEnum } from "../interfaces/IdableWebsocket";
import passwordManager, { BytePasswordType } from "./PasswordManager";
import { PlayerController } from "./PlayerController";

// TODO: refactor consideration
// * Is there a point in separating the player manager service and the PlayerController model? 
// * This use case is simple enough that we could probably merge the two together. That said, we 
// * could also keep them separate and adjust the manager to work for multiple player models. That would
// * make a lot more sense. 
export class PlayerControllerManager {

  private playerControllerClient: PlayerController | null = null
  playerId: Uint8Array | undefined;
  private idByteLength: number;

  constructor() {
    this.idByteLength = idByteLength
    this.createPlayerId()
  }

  public createPlayerId() {
    this.playerId = passwordManager.generateByteArrayPassword(BytePasswordType.PLAYER)
    const writePath = join(__dirname, "player-id.txt")
    console.log(writePath)
    console.log(uintArrayToHex(this.playerId))
    writeFile(writePath, this.playerId, 'utf8', (error) => {
      if (error) {
        console.log("write file error:")
        console.log(error)
      }
      console.log("player id stored")
    })
  }
  reset() {
    this.sendToPlayer(Uint8Array.from([messageTypeEnum.BACK_TO_LOBBY]))
    this.playerControllerClient = null
    // * if we were doing multiple player characters this could be a loop through all connected players
    this.createPlayerId()
    // this.playerControllerClient?.resetState()
  }

  public playerMove(socket: IdableWebsocket, payload: Buffer) {
    this.validateSocketId(socket)
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
      idableSocket.type = IdableWebsocketTypeEnum.PLAYER_CONTROLLER

      this.validateSocketId(idableSocket)
      this.checkIfPlayerIsAlreadyRegistered()
      this.storePlayerControllerInstance(idableSocket)
      this.notifyPlayer(messageTypeEnum.CLIENT_REGISTERED, this.playerControllerClient!.id)

    } catch (error) {
      switch (error.message) {
      }
      console.log(error)
      socket.send(Uint8Array.from([
        messageTypeEnum.ERROR,
        error.message
      ]))
    }
  }

  public notifyPlayer(messageType: messageTypeEnum, payload?: Uint8Array) {
    this.playerControllerClient?.notifyPlayer(messageType, payload)
  }

  public getPlayerController() {
    return this.playerControllerClient
  }

  private storePlayerControllerInstance(socket: IdableWebsocket) {
    this.playerControllerClient = new PlayerController(socket);
    this.playerControllerClient.id = socket.id
  }


  public removePlayerControllerInstance() {
    this.playerControllerClient = null
  }

  // TODO: I don't like this. refactor
  // * I do like the use of enums to throw and catch so we can switch on it, so maybe this is no big deal, but 
  // * it feels really weird. 
  private validateSocketId(socket: IdableWebsocket) {
    if (!this.playerId) {
      throw new Error(errorTypes.PLAYER_ID_NOT_GENERATED.toString())
    }
    if (Buffer.compare(socket.id, this.playerId) !== 0) {
      throw new Error(errorTypes.PLAYER_ID_INCORRECT.toString())
    }
  }

  private checkIfPlayerIsAlreadyRegistered() {
    if (this.playerControllerClient != null) {
      throw new Error(errorTypes.PLAYER_ALREADY_REGISTERED.toString())
    }
  }

  handleClientDisconnect(socket: IdableWebsocket) {
    // ! note we need to check the id here, otherwise if someone went to the player page 
    // ! and reloaded it would trigger this method even if they didn't submit an id. Yeah that's 
    // ! def a flaw, but I'm at the point where I want this codebase finished so I'm going to leave a 
    // ! note to future me vs fixing it :|
    if (this.playerControllerClient && Buffer.compare(socket.id, this.playerControllerClient.id!) == 0) {
      this.clearAllClients()
    }
  }

  clearAllClients() {
    this.playerControllerClient = null
  }

  sendToPlayer(message: Uint8Array) {
    this.playerControllerClient?.socket.send(message)
  }
}