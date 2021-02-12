import { WebsocketClientManager, ClientMessageBuilder, clientTypeEnum, websocketServerUrl } from "./brick-controller";

let socketManager = new WebsocketClientManager(websocketServerUrl, new ClientMessageBuilder(clientTypeEnum.BRICK_CONTROLLER))
socketManager.setBrickColor({ red: 0xff, green: 0xff, blue: 0xff })
socketManager.reconnect()

console.log("controller worked")