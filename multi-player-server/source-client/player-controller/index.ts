import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { clientTypeEnum } from "../../project-common/Enumerables";
import { websocketServerUrl } from "project-common/config.json";
import { PlayerController } from "./player-controller";
import { ReconnectConfig } from "common/WebsocketClientManager";

const reconnectConfig: ReconnectConfig = {
  attemptIntervalInMilliseconds: 1000,
  reconnectAfterLosingConnecton: true,
  totalAttempts: 100
}

document.addEventListener("DOMContentLoaded", () => {
  console.log(`Connecting to ${websocketServerUrl}`)
  new PlayerController(websocketServerUrl, new ClientMessageBuilder(clientTypeEnum.PLAYER_CONTROLLER), reconnectConfig)
})