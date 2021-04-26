import WebSocket from "ws";

export interface ControllerClient {

  id: Uint8Array;
  socket: WebSocket;
}
