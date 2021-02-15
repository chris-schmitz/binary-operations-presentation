import WebsocketServerManager from "./WebsocketServerManager"
import { ClientMessage } from "./WebsocketServerManager";
import { EventEmitter } from "events";

enum PlayPhaseEnum {
  // * we're going to group this in the first byte with the current collision state (boolean)
  IDLE = 0b010,
  PLAYING,
  GAME_OVER
}

export const TICK = 'tick'

// TODO: consider: do we need the event emitter anymore?
class GameManager extends EventEmitter {

  private playPhase: PlayPhaseEnum = PlayPhaseEnum.IDLE
  private gridState: number[] = []
  private gridColors: number[] = []
  private verboseDebuggng: boolean;

  private player = {
    rowIndex: 0,
    rowState: 0x01
  }

  private nextAvailableRow = 0
  brickAnimationIntervalId: NodeJS.Timeout | null;
  brickAnimationIntervalDelay: number;

  constructor(verboseDebugging = false, brickAnimationIntervalDelay = 2000) {
    super();
    this.verboseDebuggng = verboseDebugging
    this.brickAnimationIntervalId = null
    this.brickAnimationIntervalDelay = brickAnimationIntervalDelay
  }

  public begin() {
    this.brickAnimationIntervalId = setInterval(this.animate.bind(this), this.brickAnimationIntervalDelay)
  }

  public getNextRow() {
    // TODO: how do we want to handle freed up rows when a client disconnects??
    return this.nextAvailableRow++
  }

  public addBrick(row: number, color: Uint8Array) {
    this.gridState[row] |= 80
    this.gridColors[row] = color.reduce((carry, current) => {
      carry <<= 8; return carry + current
    })
  }

  private animate() {
    console.log("tick")
    // * byte 0:        game data (play state, collision, anything else?)
    // * byte 1:        player row index
    // * byte 2:        player row state
    // * byte 3:        grid length (8 for now)
    // * byte 4 - 12:   row states
    // * byte 13 - 21:  row colors
    const collision = 1 // ! faking it out for now

    const payload = Uint8Array.from([
      this.playPhase | collision,
      this.player.rowIndex,
      this.player.rowState,
      8,
      ...this.gridState,
      ...this.gridColors
    ])

    this.emit(TICK, payload)
  }
}

export default GameManager