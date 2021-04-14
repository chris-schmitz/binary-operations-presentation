import { GameBoard } from "./gameboard";
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { clientTypeEnum } from "../../project-common/Enumerables";
import { ReconnectConfig } from "common/WebsocketClientManager";

const reconnectConfig: ReconnectConfig = {
  attemptIntervalInMilliseconds: 1000,
  reconnectAfterLosingConnecton: true,
  totalAttempts: 100
}

const url = `ws://${window.location.host}`

const gameBoard = new GameBoard(url, new ClientMessageBuilder(clientTypeEnum.GAMEBOARD), reconnectConfig)

document.addEventListener("DOMContentLoaded", () => {
  console.log(`Connecting to websocket host at: ${url}`)
  gameBoard.begin()
})
