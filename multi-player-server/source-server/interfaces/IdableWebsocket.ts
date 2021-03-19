import WebSocket from "ws";
import { randomByte } from "../helpers/random-byte";

export enum IdableWebsocketTypeEnum {
  GAMEBOARD,
  BRICK_CONTROLLER,
  PLAYER_CONTROLLER
}


export function createId(idByteLength: number) {
  const id = randomByte(idByteLength)
  return new Uint8Array(id)
}

export interface IdableWebsocket extends WebSocket {
  id: Uint8Array;
  type: IdableWebsocketTypeEnum
}
