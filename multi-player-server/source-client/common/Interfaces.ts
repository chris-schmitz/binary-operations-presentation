import { messageTypeEnum } from "./Enumerables";

export interface ServerResponse {
  messageType: messageTypeEnum,
}

export interface RegisteredClientMessage extends ServerResponse {
  id: ArrayBuffer,
  row: number
}
export interface BrickColor {
  red: number,
  green: number
  blue: number
}