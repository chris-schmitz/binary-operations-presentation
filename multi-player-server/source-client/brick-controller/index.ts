import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { clientTypeEnum } from "../../project-common/Enumerables";
import { websocketServerUrl } from "project-common/environment.json";
import { BrickController } from "./brick-controller";
import { ReconnectConfig } from "common/WebsocketClientManager";

const reconnectConfig: ReconnectConfig = {
  attemptIntervalInMilliseconds: 1000,
  reconnectAfterLosingConnecton: true,
  totalAttempts: 100
}

document.addEventListener("DOMContentLoaded", () => {
  console.log(`Connecting to ${websocketServerUrl}`)
  let brickController = new BrickController(websocketServerUrl, new ClientMessageBuilder(clientTypeEnum.BRICK_CONTROLLER), reconnectConfig)
  brickController.begin()
})