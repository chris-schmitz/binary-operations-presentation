import WebSocket from "ws";
import { messageTypeEnum } from "../project-common/Enumerables";
import { BrickControllerClient } from "./interfaces/BrickControllerClient";
import GameManager from "./GameManager";
import { randomByte } from "./helpers/random-byte";
import { IdableWebsocket } from "./interfaces/IdableWebsocket";
import { UnableToFindController } from "./errors/UnableToFindController";

class BrickControllerManager {
  private controllers: BrickControllerClient[] = []
  gameManager: GameManager;
  waitingOnTurn: BrickControllerClient[] = []
  turnDuration: number;

  constructor(gameManager: GameManager, turnDuration: number = 5000) {
    this.gameManager = gameManager
    this.turnDuration = turnDuration
  }

  public sendToAllClients(message: string | Uint8Array) {
    this.controllers.forEach(client => client.socket.send(message))
  }

  public getControllerById(id: Uint8Array) {
    return this.controllers.find(controller => {
      return Buffer.compare(controller.id, id) == 0
    })
  }

  public registerBrickController(socket: WebSocket, idByteLength: number) {
    let id = this.createId(idByteLength)
    const controller = this.createController(socket, id)
    this.attemptRowAssignment(controller)
    this.storeController(controller)
    this.sendRegisterClientMessage(controller, id)
  }

  public handleClientDisconnect(socket: IdableWebsocket) {
    const controller = this.getControllerById(socket.id)
    if (!controller) {
      throw new UnableToFindController("Unable to find the brick controller", socket)
    }
    if (controller?.row) {
      this.gameManager.makeRowAvailable(controller.row)
    }
  }

  private sendRegisterClientMessage(controller: BrickControllerClient, id: Uint8Array) {
    let message = Uint8Array.from([
      messageTypeEnum.REGISTER_CLIENT,
      ...id
    ])
    controller.socket.send(message)
  }

  private sendBrickRowAssignedMessage(controller: BrickControllerClient, row: number) {
    controller.socket.send(Uint8Array.from([messageTypeEnum.BRICK_ROW_ASSIGNMENT, row]))
  }

  private createId(idByteLength: number) {
    const id = randomByte(idByteLength)
    return new Uint8Array(id)
  }
  private storeController(controller: BrickControllerClient) {
    this.controllers.push(controller)
  }
  private attemptRowAssignment(controller: BrickControllerClient) {
    const row = this.gameManager.getNextRow()
    if (row) {
      this.assignRowToController(controller, row)
    } else {
      this.addControllerToWaitingQueue(controller)
    }
  }
  private addControllerToWaitingQueue(controller: BrickControllerClient) {
    this.waitingOnTurn.push(controller)
    controller.socket.send(Uint8Array.from([messageTypeEnum.CONTROLLER_CONTROL_REMOVED]))
  }
  private assignRowToController(controller: BrickControllerClient, row: number) {
    controller.row = row
    this.sendBrickRowAssignedMessage(controller, row)
    this.applyTurnTimeout(controller)
  }
  applyTurnTimeout(controller: BrickControllerClient) {
    controller.turnTimeout = setTimeout(() => {
      if (this.waitingOnTurn.length != 0) {
        let row = controller.row
        controller.row = null
        this.addControllerToWaitingQueue(controller)

        const nextController = this.waitingOnTurn.shift()
        this.assignRowToController(nextController!, row!)
      } else {
        this.applyTurnTimeout(controller)
      }
    }, this.turnDuration)
  }
  private createController(socket: WebSocket, id: Uint8Array): BrickControllerClient {
    const idableSocket = socket as IdableWebsocket
    const idView = new Uint8Array(id)
    idableSocket.id = idView

    return { id: idView, socket, row: null }
  }


}

export { BrickControllerManager }