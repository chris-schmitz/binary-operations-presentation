import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { clientTypeEnum } from "../../project-common/Enumerables";
import { BrickController } from "./brick-controller";
import { ReconnectConfig } from "common/WebsocketClientManager";

const reconnectConfig: ReconnectConfig = {
  attemptIntervalInMilliseconds: 1000,
  reconnectAfterLosingConnecton: true,
  totalAttempts: 100
}

const url = `ws://${window.location.host}`

document.addEventListener("DOMContentLoaded", () => {
  console.log(`Connecting to websocket host at: ${url}`)
  let brickController = new BrickController(url, new ClientMessageBuilder(clientTypeEnum.BRICK_CONTROLLER), reconnectConfig)
  brickController.begin()
})