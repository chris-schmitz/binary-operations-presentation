import WebSocket from "ws";
import { v4 as uuid } from "uuid";
import { ControllerClient } from "./interfaces/ControllerClient";
import { randomByte } from "./helpers/helpers";
import { directionEnum, messageTypeEnum } from "../project-common/Enumerables";
import { getBinaryExpontent } from "./helpers/exponent-tools";

export class PlayerController implements ControllerClient {
  public socket: WebSocket;
  id: Uint8Array = new Uint8Array();

  playerState: PlayerState = {
    row: 0,
    columnState: 1
  }
  totalRows: number
  totalColumns: number

  // * I'm defaulting this to 8x8 re: the total rows and columns since we're fitting this to a 
  // * led matrix. for future builds we should either pass this in through the constructor or 
  // * make it a global config 
  constructor(socket: WebSocket, totalRows: number = 8, totalColumns: number = 8) {
    this.socket = socket
    this.totalRows = totalRows
    this.totalColumns = totalColumns
  }

  public notifyPlayer(messageType: messageTypeEnum, payload?: Uint8Array) {
    if (!payload) {
      payload = new Uint8Array()
    }
    let message = Uint8Array.from([
      messageType,
      ...payload
    ])
    this.socket.send(message)
  }

  public move(direction: directionEnum) {
    switch (direction) {
      case directionEnum.UP:
      case directionEnum.DOWN:
        this.updateRow(direction)
        break
      case directionEnum.LEFT:
      case directionEnum.RIGHT:
        this.updateColumn(direction)
        break
      default:
        throw new Error("direction is missing")
    }
  }

  getPlayerState(): PlayerState {
    return this.playerState
  }

  private updateRow(direction: directionEnum) {

    if (direction === directionEnum.UP && this.playerState.row > 0) {
      this.playerState.row--
    } else if (direction === directionEnum.DOWN && this.playerState.row < this.totalRows - 1) { // ? -1 to account for the 0 based index
      this.playerState.row++
    }
  }

  private updateColumn(direction: directionEnum) {
    if (direction === directionEnum.RIGHT && getBinaryExpontent(this.playerState.columnState) > 0) {
      this.playerState.columnState >>= 1
    } else if (direction === directionEnum.LEFT && getBinaryExpontent(this.playerState.columnState) < this.totalColumns - 1) {// ? -1 to account for the 0 based index

      this.playerState.columnState <<= 1
    }
  }

  public get row() {
    return this.playerState.row
  }
  public get columnState() {
    return this.playerState.columnState
  }

  public pushPlayerBackABrick(reverse = false) {
    // TODO: consider moving into player model
    this.playerState.columnState >>= 1
  }
}


export interface PlayerState {
  row: number,
  columnState: number
}