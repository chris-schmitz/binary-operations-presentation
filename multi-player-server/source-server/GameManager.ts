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
    this.brickAnimationIntervalId = setInterval(() => this.animate(), this.brickAnimationIntervalDelay)
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
    // TODO: this animate shouldn't cause a brick tick
    this.animate(false)
  }

  private initializeGrid() {
    for (let i = 0; i < this.totalRows; i++) {
      this.gridState[i] = 0
      this.gridColors[i] = 0xFF00FF
    }
  }

  // TODO: OMG ABSTRACT!!!
  private animate(shiftBricks: boolean = true) {

    if (shiftBricks) {
      for (let i = 0; i < this.totalRows; i++) {
        this.gridState[i] >>= 1
      }
    }

    let bricks = new Uint32Array(this.gridState.length)
    for (let i = 0; i < this.totalRows; i++) {
      bricks[i] = this.gridState[i]
      bricks[i] <<= 24
      bricks[i] += this.gridColors[i]
    }

    let player = 0
    if (this.playerController) {
      const commonRow = this.gridState[this.playerController.row]
      const commonRowReversed = this.reverseByte(commonRow)
      const collision = (commonRowReversed & this.playerController?.columnState) > 0

      player |= +collision
      player <<= 8
      player |= this.playerController.row
      player <<= 8
      player |= this.playerController.columnState
      console.log(`Player: ${player.toString(2)}`)
    }

    const payload = Uint32Array.from([
      messageTypeEnum.GAME_FRAME,
      this.playPhase, // TODO: fix, this is wrong, if we're going to do this we should separate each piece of information into separate nibbles or break them out to separate bytes. 
      player,
      ...bricks
    ])

    this.emit(TICK, payload)
  }

  private reverseByte(byte: number) {
    let reversed = 0
    for (let i = 0; i < 8; i++) {
      reversed <<= 1
      reversed |= byte & 0x01
      byte >>= 1
    }
    return reversed
  }
}

export default GameManager