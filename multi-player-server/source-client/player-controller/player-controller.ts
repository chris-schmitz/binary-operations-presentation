import { clientTypeEnum, directionEnum, errorTypes, messageTypeEnum } from "project-common/Enumerables";
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { ServerResponse } from "../common/Interfaces";
import WebsocketClientManager, { ClientEvents, ReconnectConfig } from "../common/WebsocketClientManager"
import { BrickColor } from "../common/BrickColor";


// ? fiddling around. does this make sense? should it just be on/off?
enum uiStateEnum {
  NOT_CONNECTED_TO_SERVER,
  CONNECTED_AND_ACTIVELY_PLAYING,
  CONNECTED_BUT_NOT_PLAYING
}

class PlayerController extends WebsocketClientManager {
  verboseLogging: boolean;
  upButtonElement: HTMLButtonElement | null = null;
  leftButtonElement: HTMLButtonElement | null = null;
  downButtonElement: HTMLButtonElement | null = null;
  rightButtonElement: HTMLButtonElement | null = null;
  idElement: HTMLInputElement | null = null;
  idSubmitButton: HTMLInputElement | null = null;
  messageElement?: HTMLParagraphElement | null = null;

  // ! Note that we're hardcoding this here, but if we made the id length fully dynamic we'd need to get this info from the server
  idByteLength: number = 4;
  constructor(websocketUrl: string, messageBuilder: ClientMessageBuilder, attemptReconnect?: ReconnectConfig, verboseLogging = true) {
    super(websocketUrl, clientTypeEnum.PLAYER_CONTROLLER, messageBuilder, attemptReconnect)
    this.verboseLogging = verboseLogging
    this.grabUIElements()
    this.addUiListeners()
    this.updateUiState(uiStateEnum.NOT_CONNECTED_TO_SERVER)
  }

  begin() {
    this.updateMessage("")
    this.reconnect(() => {
      console.log("connected to server")
      this.updateUiState(uiStateEnum.CONNECTED_AND_ACTIVELY_PLAYING)


      // TODO: possibly rip these out
      this.addErrorListener((error) => {
        this.updateUiState(uiStateEnum.CONNECTED_BUT_NOT_PLAYING)
        this.updateMessage("There was an error when communicating with the server")
      })
      this.addCloseListener((closeEvent: CloseEvent) => {
        this.updateUiState(uiStateEnum.NOT_CONNECTED_TO_SERVER)
        this.updateMessage("Connection to server closed")
      })
    })
  }
  private updateMessage(message: string) {
    if (!this.messageElement) return

    this.messageElement.innerText = message
  }
  updateUiState(state: uiStateEnum) {
    switch (state) {
      case uiStateEnum.CONNECTED_AND_ACTIVELY_PLAYING:
        this.idSubmitButton!.innerText = "✔"
        this.idSubmitButton?.classList.add("disabled")
        this.idSubmitButton!.disabled = true
        this.idElement!.disabled = true

        this.leftButtonElement!.disabled = false
        this.rightButtonElement!.disabled = false
        this.upButtonElement!.disabled = false
        this.downButtonElement!.disabled = false
        break
      case uiStateEnum.CONNECTED_BUT_NOT_PLAYING:
      // TODO: fill this out, show a message?? an alert?
      case uiStateEnum.NOT_CONNECTED_TO_SERVER:
        this.idSubmitButton!.innerText = "CONNECT"
        this.idSubmitButton?.classList.remove("disabeled")
        this.idSubmitButton!.disabled = false
        this.idElement!.disabled = false

        this.leftButtonElement!.disabled = true
        this.rightButtonElement!.disabled = true
        this.upButtonElement!.disabled = true
        this.downButtonElement!.disabled = true
        break
    }
  }

  private addUiListeners() {
    this.addButtonListeners();
    this.addKeyDownListner()
    this.addListener(ClientEvents.SOCKET_ERROR.toString(), (byteArray) => {
      debugger
      console.log(byteArray)
      this.updateUiState(uiStateEnum.CONNECTED_BUT_NOT_PLAYING)
      switch (byteArray[1]) {
        case errorTypes.PLAYER_ID_INCORRECT:

          this.updateMessage("The provided player id is incorrect")
          break
      }
    })
  }

  private addButtonListeners() {
    this.idSubmitButton?.addEventListener("click", this.registerController.bind(this));
    this.upButtonElement?.addEventListener("click", this.upButtonActivated.bind(this));
    this.downButtonElement?.addEventListener("click", this.downButtonActivated.bind(this));
    this.leftButtonElement?.addEventListener("click", this.leftButtonActivated.bind(this));
    this.rightButtonElement?.addEventListener("click", this.rightButtonActivated.bind(this));
  }

  private registerController() {
    const idString = this.idElement?.value
    const id = this.hexStringToUint8Array(idString)
    this.registrationInformation.id = id
    this.begin()
  }
  hexStringToUint8Array(idString: string | undefined) {
    if (typeof idString == "undefined") return null

    const trimmed = idString.trim()

    // * yeah I could do this in a functional way with a reduce and make a pipeline,
    // * but tbh I think this way makes it a bit more readable 
    const byteStrings = []
    const totalNibblesInId = this.idByteLength * 2
    for (let i = 0; i < totalNibblesInId; i += 2) {
      byteStrings.push(trimmed.substr(i, 2))
    }

    const byteNumbers = byteStrings.map(string => {
      return parseInt(`0x${string}`)
    })

    return Uint8Array.from(byteNumbers)

  }

  private addKeyDownListner() {
    document.addEventListener('keydown', event => {
      switch (event.code) {
        case "ArrowUp":
          this.upButtonActivated()
          break
        case "ArrowLeft":
          this.leftButtonActivated()
          break
        case "ArrowRight":
          this.rightButtonActivated()
          break
        case "ArrowDown":
          this.downButtonActivated()
          break
      }
    })
  }
  public downButtonActivated() {
    console.log('down')
    this.sendMessage(messageTypeEnum.PLAYER_MOVE, Uint8Array.from([directionEnum.DOWN]))
  }
  public rightButtonActivated() {
    console.log('right')
    this.sendMessage(messageTypeEnum.PLAYER_MOVE, Uint8Array.from([directionEnum.RIGHT]))
  }
  public leftButtonActivated() {
    console.log('left')
    this.sendMessage(messageTypeEnum.PLAYER_MOVE, Uint8Array.from([directionEnum.LEFT]))
  }
  private upButtonActivated() {
    console.log('up')
    this.sendMessage(messageTypeEnum.PLAYER_MOVE, Uint8Array.from([directionEnum.UP]))
    this.upButtonElement?.classList.add("pressed")
  }

  private

  private grabUIElements() {
    this.upButtonElement = document.querySelector("button#up")
    this.leftButtonElement = document.querySelector("button#left")
    this.downButtonElement = document.querySelector("button#down")
    this.rightButtonElement = document.querySelector("button#right")
    this.idElement = document.querySelector("#id-input")
    this.idSubmitButton = document.querySelector("#id-submission")
    this.messageElement = document.querySelector("#message") as HTMLParagraphElement
  }

}




export { PlayerController }
