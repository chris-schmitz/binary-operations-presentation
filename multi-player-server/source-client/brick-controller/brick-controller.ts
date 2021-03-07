import { client } from "websocket";
import { clientTypeEnum, messageTypeEnum } from "project-common/Enumerables";
// import { clientTypeEnum, messageTypeEnum } from "../../project-common/Enumerables";
import ClientMessageBuilder, { ClientRegisteredPayload } from "../common/ClientMessageBuilder";
import { ServerResponse, BrickColor } from "../common/Interfaces";
import WebsocketClientManager, { ClientEvents, ReconnectConfig, ReturnMessagePayloadType } from "../common/WebsocketClientManager"

class BrickController extends WebsocketClientManager {

  verboseLogging: boolean

  brickColor: BrickColor = { red: 0xff, green: 0x00, blue: 0x00 }

  rowNumberElement: Element | null = null
  brickButtonElement: HTMLButtonElement | null = null
  colorPicker: Element | null = null

  constructor(websocketUrl: string, messageBuilder: ClientMessageBuilder, attemptReconnect?: ReconnectConfig, verboseLogging = true) {
    super(websocketUrl, clientTypeEnum.BRICK_CONTROLLER, messageBuilder, attemptReconnect)
    this.verboseLogging = verboseLogging

    this.grabUiElements()
  }

  public begin() {
    this.setBrickColor({ red: 0xff, green: 0x00, blue: 0xff })
    this.reconnect(() => {
      this.addBrickControllerListeners()
    })
  }

  private updateBrickColor(changeEvent: Event) {
    const target = changeEvent.target as HTMLInputElement
    let hexColor = parseInt(target.value.slice(1, target.value.length), 16) // ? chop off that `#` from the string
    const blue = hexColor & 0xFF
    hexColor >>= 8
    const green = hexColor & 0xFF
    hexColor >>= 8
    const red = hexColor & 0xFF
    this.setBrickColor({ red, green, blue })
    this.setButtonColor({ red, green, blue })
  }
  setButtonColor(color: BrickColor) {
    if (!this.brickButtonElement) return
    this.brickButtonElement.style.backgroundColor = `rgb(${color.red}, ${color.green}, ${color.blue})`
  }

  public setBrickColor(color: BrickColor) {
    this.brickColor = color
  }

  private grabUiElements() {
    this.rowNumberElement = document.querySelector("#row-number")
    this.brickButtonElement = document.querySelector("#brick-button")
    this.colorPicker = document.querySelector("#color-picker")
  }



  private addBrickControllerListeners() {
    console.log("Adding listeners")
    // this.addListener(ClientEvents.CLIENT_REGISTRATION_COMPLETE.toString(), this.activateControls.bind(this))
    this.addListener(ClientEvents.SOCKET_ERROR.toString(), (message) => {
      console.log("socket error:")
      console.log(message)
    })

    // TODO: refactor consideration
    // * we're never going to see the frame on the brick-controller side because on the server side we're only 
    // * sending the frames to the game boards. That said, there's some info that could be useful, so post MVP (laughs)
    // * consider whether or not we should send the frames to the other controllers as well. 
    this.addListener(ClientEvents.GAME_FRAME.toString(), (message) => {
      console.log("got a game frame")
      console.log(message)
    })

    this.addListener(ClientEvents.BRICK_ROW_ASSIGNED.toString(), this.activateControls.bind(this))
    this.addListener(ClientEvents.WAITING_FOR_TURN.toString(), this.waitForTurn.bind(this))


    this.brickButtonElement?.addEventListener("click", this.sendBrickCommand.bind(this))
    this.colorPicker?.addEventListener("change", this.updateBrickColor.bind(this))
  }


  public sendBrickCommand() {
    if (this.registrationInformation.id) {

      // TODO: add the id to the send brick command so we can validate 
      let brickColor = Uint8Array.from([this.brickColor.red, this.brickColor.green, this.brickColor.blue])

      this.sendMessage(messageTypeEnum.ADD_BRICK, brickColor)
    }
  }

  private waitForTurn() {
    debugger
    this.rowNumberElement!.innerHTML = "Waiting for turn"
    this.brickButtonElement?.classList.add("disabled")
    this.brickButtonElement?.setAttribute("disabled", true.toString())

  }


  private activateControls(row: number) {
    this.rowNumberElement!.innerHTML = `Row: ${row}`
    this.brickButtonElement?.classList.remove("disabled")
    this.brickButtonElement?.removeAttribute("disabled")
  }

  // TODO: ripout
  private async blobToJson(blob: Blob): Promise<ServerResponse> {
    // * I'll likely convert this to just sending strings, but it's pretty cool to put 
    // * data together on the server as a buffer of bytes, send it down here to the client
    // * and then encode it ourselves

    // ^ Our data starts as a blob; an immutable chunk of binary data
    // ^ we can't do much with that so we convert it to an ArrayBuffer 
    // ^ which is a _generic_ fixed length of _bytes_. 
    let buffer = await blob.arrayBuffer()
    if (this.verboseLogging) console.log(`buffer: ${buffer}`)

    // ^ We've got an array of bytes, but we don't know how we should interpret or view them. 
    // ? Think of: 3141234567. it' just a random group of numbers, but if we interpret it as
    // ? a phone number it's `314-123-4567`. The way we interpret the data tells us the meaning
    // ^ We know that each of the bytes represents a character code for our message, so we want 
    // ^ to view the data as individual bytes since in utf a character is represented by a single 
    // ^ byte. 
    let byteArray = new Uint8Array(buffer)
    if (this.verboseLogging) console.log(`byte array: ${byteArray}`)

    // ^ Now that that we have our bytes and they're in an iterable form (i.e. the Array of the `Uint8Array`), 
    // ^ we can turn our byte array into a string of unicode characters. 
    let json = String.fromCharCode(...byteArray)
    if (this.verboseLogging) console.log(`json: ${json}`)

    // ^ and now we can turn our string of json into actual json
    if (this.verboseLogging) console.log(JSON.parse(json))
    return JSON.parse(json)
  }
}



export { BrickController }
