import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { clientTypeEnum } from "../../project-common/Enumerables";
import { websocketServerUrl } from "project-common/config.json";
import { BrickController } from "./brick-controller";

let brickController = new BrickController(websocketServerUrl, new ClientMessageBuilder(clientTypeEnum.BRICK_CONTROLLER))
brickController.begin()