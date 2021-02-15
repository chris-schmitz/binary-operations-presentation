import WebsocketServerManager from "./WebsocketServerManager"
import { ClientMessage } from "./WebsocketServerManager";
import { EventEmitter } from "events";
import { messageTypeEnum } from "../project-common/Enumerables";

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
  private brickAnimationIntervalId: NodeJS.Timeout | null;
  private brickAnimationIntervalDelay: number;
  private totalRows: number;
  private totalColumns: number;

  constructor(verboseDebugging = false, brickAnimationIntervalDelay = 500, totalRows = 8, totalColumns = 8) {
    super();
    this.verboseDebuggng = verboseDebugging
    this.brickAnimationIntervalId = null
    this.brickAnimationIntervalDelay = brickAnimationIntervalDelay

    this.totalRows = totalRows
    this.totalColumns = totalColumns

    this.initializeGrid()
  }

  public begin() {
    this.brickAnimationIntervalId = setInterval(this.animate.bind(this), this.brickAnimationIntervalDelay)
  }


  public getNextRow() {
    // TODO: how do we want to handle freed up rows when a client disconnects??
    return this.nextAvailableRow++
  }

  public addBrick(row: number, color: Uint8Array) {
    this.gridState[row] |= 0x80
    this.gridColors[row] = color.reduce((carry, current) => {
      carry <<= 8; return carry + current
    })
  }

  private initializeGrid() {
    for (let i = 0; i < this.totalRows; i++) {
      this.gridState[i] = 0
      this.gridColors[i] = 0xFF00FF
    }
  }

  private animate() {
    console.log("tick")

    for (let i = 0; i < this.totalRows; i++) {
      this.gridState[i] >>= 1
    }
    // * byte 0:        messageTypeEnum game frame
    // * byte 1:        game data (play state, collision, anything else?)
    // * byte 2:        player row index
    // * byte 3:        player row state
    // * byte 4:        grid length (8 for now)
    // * byte 5 - 13:   row states
    // * byte 14 - 22:  row colors
    const collision = 1 // ! faking it out for now

    const payload = Uint8Array.from([
      messageTypeEnum.GAME_FRAME,
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