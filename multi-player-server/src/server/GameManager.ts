import WebsocketManager from "./WebsocketManager"
import { ClientMessage } from "./WebsocketManager";

class GameManager {

  private gameState: number[] = []
  private socketManager: WebsocketManager

  constructor(socketManager: WebsocketManager) {
    this.socketManager = socketManager

    this.socketManager.on("client-message", () => {
      console.log("caught emitted event")
    })
    // this.socketManager.on("client-message", this.handleClientMessage)

    let fakeData = 0xFF
    while (fakeData !== 0) {
      this.gameState.push(fakeData)
      fakeData >>= 1
    }
  }


  public sendState() {
    // TODO: refactor consideration
    // * Look how far we're reaching into a different class. This is what Jon was describing as a greedy
    // * abstraction. Go back and wrap the websocket manager in it's own class and make a "send to clients"
    // * method. 
    this.socketManager.sendToAllClients("hey all")
  }

  private handleClientMessage(payload: ClientMessage) {
    console.log("We got a client message event! ")
    this.sendState()
  }
}

export default GameManager