import WebSocket from "ws";




export interface IdableWebsocket extends WebSocket {
  id: Uint8Array;
}
