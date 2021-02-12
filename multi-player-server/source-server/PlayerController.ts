import WebSocket from "ws";
import { v4 as uuid } from "uuid";

export class PlayerController {
  private _id: string;
  private socket: WebSocket;


  constructor(socket: WebSocket) {
    this.socket = socket;
    this._id = this.generateId();
  }

  generateId() {
    return uuid();
  }

  get id() {
    return this._id;
  }
}
