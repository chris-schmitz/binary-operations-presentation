import WebSocket from "ws";
import { v4 as uuid } from "uuid";
import { ControllerClient } from "./interfaces/ControllerClient";
import { randomByte } from "./helpers/random-byte";
import { messageTypeEnum } from "./Enumerables";

export class PlayerController implements ControllerClient {
  public socket: WebSocket;
  id: Uint8Array = new Uint8Array();

  constructor(socket: WebSocket) {
    this.socket = socket;
    this.id = PlayerController.generateId()
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
}
