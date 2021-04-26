import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { clientTypeEnum } from "../../project-common/Enumerables";
import { ReconnectConfig } from "common/WebsocketClientManager";
import { MultiBrickController } from "./multi-brick-controller";

const reconnectConfig: ReconnectConfig = {
  attemptIntervalInMilliseconds: 1000,
  reconnectAfterLosingConnecton: true,
  totalAttempts: 100
}

const url = `ws://${window.location.host}`

document.addEventListener("DOMContentLoaded", () => {
  console.log(`Connecting to websocket host at: ${url}`)
  let brickController = new MultiBrickController(url, new ClientMessageBuilder(clientTypeEnum.BRICK_CONTROLLER), reconnectConfig)
  brickController.begin()
})