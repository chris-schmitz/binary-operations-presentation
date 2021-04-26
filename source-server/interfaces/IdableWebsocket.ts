import WebSocket from "ws";

export enum IdableWebsocketTypeEnum {
  GAMEBOARD,
  BRICK_CONTROLLER,
  PLAYER_CONTROLLER
}


export interface IdableWebsocket extends WebSocket {
  id: Uint8Array;
  type: IdableWebsocketTypeEnum
}
