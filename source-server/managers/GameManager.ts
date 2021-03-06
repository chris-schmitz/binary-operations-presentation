import { EventEmitter } from "events";
import { messageTypeEnum, PlayPhaseEnum } from "../../project-common/Enumerables";
import { PlayerController } from "./PlayerController";
import { join } from "path"
import { writeFile } from "fs";
import { idByteLength } from "../../project-common/config.json";
import passwordManager, { BytePasswordType } from "./PasswordManager";

export const TICK = 'tick'
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
  _allowCollisions: boolean = false;


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
    this.playerController?.resetState()
    this.initializeGrid()
    this.allowCollisions = false
    this.brickAnimationIntervalId = setInterval(() => this.animate(), this.brickAnimationIntervalDelay)
  }
  private setPlayPhase(phase: PlayPhaseEnum) {
    this.playPhase = phase
  }

  public restartGame(id: Uint8Array) {
    this.verifyAdminId(id)
    this.stopAnimation()
    this.begin()
  }
  private verifyAdminId(id: Uint8Array) {
    if (Buffer.compare(id, this.adminId!) !== 0) {
      throw new Error("Invalid admin ID")
    }
  }

  private createGameManagerAdminId() {
    this.adminId = passwordManager.generateByteArrayPassword(BytePasswordType.ADMIN)
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
    if (this.playPhase == PlayPhaseEnum.PLAYING) {
      this.gridState[row] |= 0x100 // ! TEMP FIX -> go back and debug
      this.gridColors[row] = color.reduce((carry, current) => {
        carry <<= 8; return carry + current
      })
    }
  }

  public updatePlayerState(playerController: PlayerController | null) {
    if (!playerController) return
    this.allowCollisions = true
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

    // ^ Byte number in the 32 bit array value
    // ^ |       3|       2|       1|       0|
    // * +--------|--------|--------|--------+
    // * |        |        |        |msg type| message type
    // * |        |        |        |ply phas| play phase
    // * |        |collisin|row #   |clmn sta| player info (collision, row number, column state)
    // * |row 0 st|red     |green   |blue    | grid row state (row # state, red, green, blue )
    // * |row 1 st|red     |green   |blue    | grid row state (row # state, red, green, blue )
    // * |row 2 st|red     |green   |blue    | grid row state (row # state, red, green, blue )
    // * |row 3 st|red     |green   |blue    | grid row state (row # state, red, green, blue )
    // * |row 4 st|red     |green   |blue    | grid row state (row # state, red, green, blue )
    // * |row 5 st|red     |green   |blue    | grid row state (row # state, red, green, blue )
    // * |row 6 st|red     |green   |blue    | grid row state (row # state, red, green, blue )
    // * |row 7 st|red     |green   |blue    | grid row state (row # state, red, green, blue )
    // * +--------|--------|--------|--------+

    const payload = Uint32Array.from([
      messageTypeEnum.GAME_FRAME,
      this.playPhase,
      player,
      ...bricks
    ])

    this.emit(TICK, payload)
  }
  // TODO: figure out how else we want to handle this
  private updatePlayPhase() {
    if (this.playPhase == PlayPhaseEnum.PLAYING && this.playerController?.columnState == 0) {
      this.playPhase = PlayPhaseEnum.GAME_OVER
    }
  }
  stopAnimation() {
    clearInterval(this.brickAnimationIntervalId!)
    this.brickAnimationIntervalId = null
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
    if (this.playerController && this.allowCollisions === true) {
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

  get allowCollisions(): boolean {
    return this._allowCollisions
  }

  set allowCollisions(state: boolean) {
    this._allowCollisions = state
  }
}

export default GameManager