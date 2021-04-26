import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { clientTypeEnum } from "../../project-common/Enumerables";
import { PlayerController } from "./player-controller";
import { ReconnectConfig } from "common/WebsocketClientManager";

const reconnectConfig: ReconnectConfig = {
  attemptIntervalInMilliseconds: 1000,
  reconnectAfterLosingConnecton: true,
  totalAttempts: 100
}

const url = `ws://${window.location.host}`
document.addEventListener("DOMContentLoaded", () => {
  console.log(`Connecting to websocket host at: ${url}`)
  new PlayerController(url, new ClientMessageBuilder(clientTypeEnum.PLAYER_CONTROLLER), reconnectConfig)
})