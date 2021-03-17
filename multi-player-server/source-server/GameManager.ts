import { EventEmitter } from "events";
import { messageTypeEnum } from "../project-common/Enumerables";
import { PlayerController, PlayerState } from "./PlayerController";

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

  private availableRows: Array<number> = []
  private brickAnimationIntervalId: NodeJS.Timeout | null;
  private brickAnimationIntervalDelay: number;
  private totalRows: number;
  private totalColumns: number; //todo: ripout
  playerController: PlayerController | undefined;


  constructor(verboseDebugging = false, brickAnimationIntervalDelay = 500, totalRows = 8, totalColumns = 8) {
    super();
    this.verboseDebuggng = verboseDebugging
    this.brickAnimationIntervalId = null
    this.brickAnimationIntervalDelay = brickAnimationIntervalDelay

    this.totalRows = totalRows
    this.totalColumns = totalColumns

    // this.availableRows = [1, 2]
    this.availableRows = Array.from(Array(totalRows).keys())

    this.initializeGrid()
  }

  public begin() {
    this.brickAnimationIntervalId = setInterval(this.animate.bind(this), this.brickAnimationIntervalDelay)
  }


  get thereAreAvailableRows() {
    return this.availableRows.length !== 0
  }
  public getNextRow() {
    if (this.availableRows == undefined) {
      throw new Error("Error initializing available rows")
    }
    return this.availableRows.shift()
  }

  public makeRowAvailable(row: number) {
    this.availableRows.push(row)
  }



  public addBrick(row: number, color: Uint8Array) {
    this.gridState[row] |= 0x100 // ! TEMP FIX -> go back and debug
    this.gridColors[row] = color.reduce((carry, current) => {
      carry <<= 8; return carry + current
    })
  }

  public updatePlayerState(playerController: PlayerController | null) {
    if (!playerController) return
    this.playerController = playerController
  }

  private initializeGrid() {
    for (let i = 0; i < this.totalRows; i++) {
      this.gridState[i] = 0
      this.gridColors[i] = 0xFF00FF
    }
  }

  private animate() {

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

    let player = 0
    if (this.playerController) {
      player |= this.playerController.row
      player <<= 8
      player |= this.playerController.columnState
    }

    let bricks = new Uint32Array(this.gridState.length)
    for (let i = 0; i < this.totalRows; i++) {
      bricks[i] = this.gridState[i]
      bricks[i] <<= 24
      bricks[i] += this.gridColors[i]
    }

    const payload = Uint32Array.from([
      messageTypeEnum.GAME_FRAME,
      this.playPhase | collision, // TODO: fix, this is wrong, if we're going to do this we should separate each piece of information into separate nibbles or break them out to separate bytes. 
      player,
      ...bricks
    ])

    this.emit(TICK, payload)
  }
}

export default GameManager