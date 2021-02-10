import WebsocketManager from "./WebsocketManager"
import { ClientMessage } from "./WebsocketManager";
import { EventEmitter } from "events";

class GameManager extends EventEmitter {

  private gameState: number[] = []
  private verboseDebuggng: boolean;

  private nextAvailableRow = 0

  constructor(verboseDebugging = false) {
    super();
    this.verboseDebuggng = verboseDebugging
  }

  getNextRow() {
    // TODO: how do we want to handle freed up rows when a client disconnects??
    return this.nextAvailableRow++
  }
}

export default GameManager