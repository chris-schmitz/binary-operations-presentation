import WebSocket from "ws";
import { messageTypeEnum } from "../project-common/Enumerables";
import { BrickControllerClient } from "./interfaces/BrickControllerClient";
import GameManager, { TICK } from "./GameManager";
import { randomByte } from "./helpers/random-byte";
import { IdableWebsocket } from "./interfaces/IdableWebsocket";
import { UnableToFindController } from "./errors/UnableToFindController";
import { cloneDeep } from "lodash";
import { PlayerController } from "./PlayerController";
import { ControllerClient } from "./interfaces/ControllerClient";

class BrickControllerManager {
  private controllers: BrickControllerClient[] = []
  gameManager: GameManager
  waitingOnTurn: Uint8Array[] = []
  activelyPlaying: Uint8Array[] = []
  totalTicksPerTurn: number
  currentTurnCount: number = 0

  constructor(gameManager: GameManager, totalTicksPerTurn: number = 5) {
    this.gameManager = gameManager
    this.totalTicksPerTurn = totalTicksPerTurn

    this.gameManager.addListener(TICK, this.incrementTurnShuffle.bind(this))
  }


  private incrementTurnShuffle() {
    this.currentTurnCount++
    if (this.currentTurnCount > this.totalTicksPerTurn) {
      this.currentTurnCount = 0
      this.shuffleTurns()
    }
  }
  private shuffleTurns() {
    if (this.waitingOnTurn.length == 0) {
      return
    }
    if (this.activelyPlaying.length == 0) {
      return
    }

    const clientIds = cloneDeep(this.waitingOnTurn)
    clientIds.forEach(id => {
      this.swapOrAssignRow(id)
    })
  }

  private swapOrAssignRow(clientId: Uint8Array) {
    const activeController = this.getControllerById(this.shiftOffOfActivelyPlayingQueue()!)
    let row
    if (activeController) {
      row = activeController.row!
      activeController.row = null

      this.addToWaitingOnTurnQueue(activeController)
    } else {
      row = this.gameManager.getNextRow()
    }
    if (!row) {
      throw new Error("Unable to get a row when one should be available")
    }

    let controllerWaitingTurn = this.getControllerById(clientId)
    if (!controllerWaitingTurn) throw new Error("Shouldn't get here, right?!")
    this.removeFromWaitingOnTurnQueue(controllerWaitingTurn)
    this.assignRowToController(controllerWaitingTurn, row)
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
      // TODO:throw this??
      //   throw new UnableToFindController("Unable to find the brick controller", socket)
      return
    }
    if (controller?.row) {
      this.gameManager.makeRowAvailable(controller.row)
    }
    this.removeClientFromAllWorkingArrays(controller)
  }

  private shiftOffOfActivelyPlayingQueue() {
    return this.activelyPlaying.shift()
  }

  private addToActivelyPlayingQueue(controller: BrickControllerClient, row: number) {
    this.activelyPlaying.push(controller.id)
    controller.socket.send(Uint8Array.from([messageTypeEnum.BRICK_ROW_ASSIGNMENT, row]))
  }
  private addToWaitingOnTurnQueue(controller: BrickControllerClient) {
    this.waitingOnTurn.push(controller.id)
    controller.socket.send(Uint8Array.from([messageTypeEnum.CONTROLLER_CONTROL_REMOVED]))
  }

  private removeFromActivelyPlayingQueue(controller: BrickControllerClient) {
    const index = this.activelyPlaying.findIndex(clientId => Buffer.compare(clientId, controller.id) === 0)
    // TODO: consider: should we throw an exception here and, where we don't want the exception to halt everything, catch and ignore?
    // ? If we do the catch and ignore be sure to make a custom error so we can catch only this specific error
    if (index !== -1) {
      this.activelyPlaying.splice(index, 1)
    }
  }
  private removeFromWaitingOnTurnQueue(controller: BrickControllerClient) {
    const index = this.waitingOnTurn.findIndex(clientId => Buffer.compare(clientId, controller.id) === 0)
    if (index !== -1) {
      this.waitingOnTurn.splice(index, 1)
    }
  }
  private removeFromControllerArray(controller: BrickControllerClient) {
    const index = this.controllers.findIndex(client => Buffer.compare(client.id, controller.id) === 0)
    if (index !== -1) {
      this.controllers.splice(index, 1)
    }
  }

  private removeClientFromAllWorkingArrays(controller: BrickControllerClient) {
    try {
      this.removeFromActivelyPlayingQueue(controller)
      this.removeFromWaitingOnTurnQueue(controller)
      this.removeFromControllerArray(controller)
    } catch (error) {
      console.log("Remove clients from all working arrays error")
      console.log(error)
    }
  }

  private sendRegisterClientMessage(controller: ControllerClient, id: Uint8Array) {
    let message = Uint8Array.from([
      messageTypeEnum.CLIENT_REGISTERED,
      ...id
    ])
    controller.socket.send(message)
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
      this.addToWaitingOnTurnQueue(controller)
    }
  }
  private assignRowToController(controller: BrickControllerClient, row: number) {
    controller.row = row
    this.addToActivelyPlayingQueue(controller, row)
  }

  private createController(socket: WebSocket, id: Uint8Array): BrickControllerClient {
    const idableSocket = socket as IdableWebsocket
    const idView = new Uint8Array(id)
    idableSocket.id = idView

    return { id: idView, socket, row: null }
  }
}

export { BrickControllerManager }