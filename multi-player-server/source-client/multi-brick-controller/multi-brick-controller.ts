import { clientTypeEnum, messageTypeEnum } from "project-common/Enumerables";
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import WebsocketClientManager, { ClientEvents, ReconnectConfig } from "../common/WebsocketClientManager"
import { BrickColor } from "../common/BrickColor";
import ControlCell, { ControlCellEnum } from "./ControlCell";



class MultiBrickController extends WebsocketClientManager {
  verboseLogging: boolean
  rowNumberElement: Element | null = null
  brickButtonCells: ControlCell[] = []
  buttonLockTickCountTotal: number
  shootSound: HTMLAudioElement | null = null

  constructor(websocketUrl: string, messageBuilder: ClientMessageBuilder, attemptReconnect?: ReconnectConfig, verboseLogging = true) {
    super(websocketUrl, clientTypeEnum.MULTI_BRICK_CONTROLLER, messageBuilder, attemptReconnect)
    this.verboseLogging = verboseLogging

    this.buttonLockTickCountTotal = 3

    this.grabUiElements()
  }

  public begin() {
    this.reconnect(() => {
      this.activateControlCells()
      this.addMessageListeners()
    })
  }
  addMessageListeners() {
    this.addListener(ClientEvents.GAME_TICK.toString(), this.buttonLockHandler.bind(this))
  }
  buttonLockHandler() {
    this.brickButtonCells.forEach(cell => cell.tick())
  }
  activateControlCells() {
    this.brickButtonCells.forEach(cell => {
      cell.unlockButton()
      cell.addListener(ControlCellEnum.FIRE_BRICK.toString(), this.relayBrickCommand.bind(this))
    })
  }
  relayBrickCommand(payload: { color: BrickColor, index: number }) {
    const { color, index } = payload
    this.sendBrickCommand(color, index)
  }

  private grabUiElements() {
    document.querySelectorAll(".cell").forEach((element, index) => {
      this.brickButtonCells.push(new ControlCell(element, index, this.buttonLockTickCountTotal))
    })

    this.shootSound = document.querySelector("#shoot-sound")
  }


  public sendBrickCommand(color: BrickColor, index: number) {
    if (this.registrationInformation.id) {

      this.shootSound?.play()

      // TODO: add the id to the send brick command so we can validate 
      const parsedColor = color.asRGB()
      let brickColorAndIndex = Uint8Array.from([parsedColor.red, parsedColor.green, parsedColor.blue, index])
      this.sendMessage(messageTypeEnum.ADD_BRICK, brickColorAndIndex)
    }
  }


}



export { MultiBrickController }
