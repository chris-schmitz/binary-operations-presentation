import WebSocket from "ws";

export class SocketError extends Error {
  private socket: WebSocket;
  constructor(socket: WebSocket, message: string) {
    super(message);
    this.socket = socket;
  }
}
