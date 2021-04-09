import { GameBoard } from "./gameboard";
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { clientTypeEnum } from "../../project-common/Enumerables";
import { websocketServerUrl } from "../../project-common/environment.json";
import { ReconnectConfig } from "common/WebsocketClientManager";

const reconnectConfig: ReconnectConfig = {
  attemptIntervalInMilliseconds: 1000,
  reconnectAfterLosingConnecton: true,
  totalAttempts: 100
}


const gameBoard = new GameBoard(websocketServerUrl, new ClientMessageBuilder(clientTypeEnum.GAMEBOARD), reconnectConfig)

document.addEventListener("DOMContentLoaded", () => {
  console.log(`Connecting to ${websocketServerUrl}`)
  gameBoard.begin()
})
