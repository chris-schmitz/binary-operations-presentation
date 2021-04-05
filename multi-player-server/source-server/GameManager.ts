import { EventEmitter } from "events";
import { messageTypeEnum, PlayPhaseEnum } from "../project-common/Enumerables";
import { uintArrayToHex } from "./helpers/number-tools";
import { createId } from "./interfaces/IdableWebsocket";
import { PlayerController, PlayerState } from "./PlayerController";
import { join } from "path"
import { writeFile } from "fs";
import { idByteLength } from "../project-common/config.json";

export const TICK = 'tick'

// TODO: consider: do we need the event emitter anymore?
class GameManager extends EventEmitter {
  idByteLength: number = idByteLength;

  private playPhase: PlayPhaseEnum = PlayPhaseEnum.PLAYING
  private gridState: number[] = []
  private gridColors: number[] = []
  private verboseDebuggng: boolean;

  private availableRows: Array<number> = []
  private brickAnimationIntervalId: NodeJS.Timeout | null
  private brickAnimationIntervalDelay: number
  private totalRows: number
  private totalColumns: number //todo: ripout
  playerController: PlayerController | undefined
  adminId: Uint8Array | undefined


  constructor(verboseDebugging = false, brickAnimationIntervalDelay = 500, totalRows = 8, totalColumns = 8) {
    super();
    this.verboseDebuggng = verboseDebugging
    this.brickAnimationIntervalId = null
    this.brickAnimationIntervalDelay = brickAnimationIntervalDelay

    this.totalRows = totalRows
    this.totalColumns = totalColumns

    this.availableRows = Array.from(Array(totalRows).keys())

    this.initializeGrid()
    this.createGameManagerAdminId()
  }

  public begin() {
    this.setPlayPhase(PlayPhaseEnum.PLAYING);
    this.initializeGrid()
    this.clearPlayerController()
    this.brickAnimationIntervalId = setInterval(() => this.animate(), this.brickAnimationIntervalDelay)
  }
  private setPlayPhase(phase: PlayPhaseEnum) {
    this.playPhase = phase
  }

  public restartGame(id: Uint8Array) {
    this.verifyAdminId(id)
    this.begin()
  }
  private clearPlayerController() {
    this.playerController = undefined
  }
  private verifyAdminId(id: Uint8Array) {
    if (Buffer.compare(id, this.adminId!) !== 0) {
      throw new Error("Invalid admin ID")
    }
  }

  private createGameManagerAdminId() {
    this.adminId = createId(this.idByteLength)
    const writePath = join(__dirname, "admin-id.txt")

    writeFile(writePath, Uint8Array.from([0x05, 0x0E, ...this.adminId]), 'utf8', (error) => {
      if (error) {
        console.log("write file error:")
        console.log(error)
      }
      console.log("admin id stored")
    })
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
      this.shiftBricks()
    }

    let bricks = this.packageBrickState()
    let player = this.packagePlayerState()
    this.updatePlayPhase()

    const payload = Uint32Array.from([
      messageTypeEnum.GAME_FRAME,
      this.playPhase, // TODO: fix, this is wrong, if we're going to do this we should separate each piece of information into separate nibbles or break them out to separate bytes. 
      player,
      ...bricks
    ])

    this.emit(TICK, payload)
  }
  // TODO: figure out how else we want to handle this
  private updatePlayPhase() {
    if (this.playPhase == PlayPhaseEnum.PLAYING && this.playerController?.columnState == 0) {
      this.playPhase = PlayPhaseEnum.GAME_OVER
      this.stopAnimation() // TODO: consider moving this. this method is probably not where we want this
    }
  }
  stopAnimation() {
    clearInterval(this.brickAnimationIntervalId!)
  }
  packagePlayerState() {
    let player = 0
    if (this.playerController) {
      const collision = this.detectCollision()
      if (collision) this.playerController.pushPlayerBackABrick()

      player |= +collision
      player <<= 8
      player |= this.playerController.row
      player <<= 8
      player |= this.playerController.columnState
      console.log(`Player: ${player.toString(2)}`)
    }
    return player
  }
  private detectCollision() {
    let collision = false
    if (this.playerController) {
      const commonRow = this.gridState[this.playerController.row]
      collision = (commonRow & this.playerController?.columnState) > 0
    }
    return collision
  }

  private packageBrickState() {
    let bricks = new Uint32Array(this.gridState.length);
    for (let i = 0; i < this.totalRows; i++) {
      bricks[i] = this.gridState[i];
      bricks[i] <<= 24;
      bricks[i] += this.gridColors[i];
    }
    return bricks;
  }

  private shiftBricks() {
    for (let i = 0; i < this.totalRows; i++) {
      this.gridState[i] >>= 1
    }
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