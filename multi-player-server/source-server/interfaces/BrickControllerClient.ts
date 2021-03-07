import WebSocket from "ws";


export interface BrickControllerClient {
  id: Uint8Array;
  socket: WebSocket;
  row: number | null;
  turnTimeout?: NodeJS.Timeout;
}
