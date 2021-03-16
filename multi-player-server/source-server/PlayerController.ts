import WebSocket from "ws";
import { v4 as uuid } from "uuid";
import { ControllerClient } from "./interfaces/ControllerClient";
import { randomByte } from "./helpers/random-byte";
import { directionEnum, messageTypeEnum } from "../project-common/Enumerables";
import { getBinaryExpontent } from "./helpers/exponent-tools";

export class PlayerController implements ControllerClient {
  public socket: WebSocket;
  id: Uint8Array = new Uint8Array();
  row: number = 0
  columnState: number = 1
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

  static generateId() {
    return new Uint8Array(randomByte(4))
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
    console.log("---> player state:")
    console.log(`row: ${this.row}`)
    console.log(`columnState: ${this.columnState}`)
  }

  private updateRow(direction: directionEnum) {

    if (direction === directionEnum.UP && this.row > 0) {
      this.row--
    } else if (direction === directionEnum.DOWN && this.row < this.totalRows) {
      this.row++
    }
  }

  private updateColumn(direction: directionEnum) {
    if (direction === directionEnum.RIGHT && getBinaryExpontent(this.columnState) > 0) {
      this.columnState >>= 1
    } else if (direction === directionEnum.LEFT && getBinaryExpontent(this.columnState) < this.totalColumns) {
      this.columnState <<= 1
    }
  }
}
