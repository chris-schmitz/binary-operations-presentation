import { GameBoard } from "./gameboard";
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { clientTypeEnum } from "../../project-common/Enumerables";
import { websocketServerUrl } from "../../project-common/config.json";

const gameBoard = new GameBoard(websocketServerUrl, new ClientMessageBuilder(clientTypeEnum.GAMEBOARD))

document.addEventListener("DOMContentLoaded", () => {
  console.log(`Connecting to ${websocketServerUrl}`)
  gameBoard.begin()
})
