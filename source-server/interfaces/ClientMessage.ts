import WebSocket from "ws";

// TODO: move interfaces out to a separate file



export interface ClientMessage {
  data: WebSocket.Data;
  client: WebSocket;
}
