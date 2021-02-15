import { GameBoard } from "./gameboard";
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { messageTypeEnum, clientTypeEnum } from "../../project-common/Enumerables";
import { websocketServerUrl } from "../../project-common/config.json";

const gameBoard = new GameBoard(websocketServerUrl, new ClientMessageBuilder(clientTypeEnum.GAMEBOARD))
gameBoard.begin()

document.addEventListener('readystatechange', () => gameBoard.initalize())
