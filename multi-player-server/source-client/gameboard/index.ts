import { StateRenderer } from "./gameboard";
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { messageTypeEnum, clientTypeEnum } from "../../project-common/Enumerables";

const builder = new ClientMessageBuilder(clientTypeEnum.GAMEBOARD)

const stateRenderer = new StateRenderer(builder)

document.addEventListener('readystatechange', () => stateRenderer.initalize())
