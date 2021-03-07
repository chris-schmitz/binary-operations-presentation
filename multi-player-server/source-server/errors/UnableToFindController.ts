import { IdableWebsocket } from "../interfaces/IdableWebsocket";

export class UnableToFindController extends Error {
  socket: IdableWebsocket;
  constructor(message: string, socket: IdableWebsocket) {
    super(message);
    this.socket = socket;
  }

  getSocketId() {
    return this.socket.id;
  }
}
