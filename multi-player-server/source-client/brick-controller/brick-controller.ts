import { client } from "websocket";
import { clientTypeEnum, messageTypeEnum } from "project-common/Enumerables";
// import { clientTypeEnum, messageTypeEnum } from "../../project-common/Enumerables";
import ClientMessageBuilder, { ClientRegisteredPayload } from "../common/ClientMessageBuilder";
import { ServerResponse, BrickColor } from "../common/Interfaces";
import WebsocketClientManager, { ReturnMessagePayloadType } from "../common/WebsocketClientManager"

class BrickController extends WebsocketClientManager {

  verboseLogging: boolean

  brickColor: BrickColor = { red: 0xff, green: 0x00, blue: 0x00 }

  rowNumberElement: Element | null = null
  brickButtonElement: Element | null = null

  constructor(websocketUrl: string, messageBuilder: ClientMessageBuilder, attemptReconnect = true, verboseLogging = true) {
    super(websocketUrl, clientTypeEnum.BRICK_CONTROLLER, messageBuilder, attemptReconnect)
    this.verboseLogging = verboseLogging

    this.addBrickControllerListeners()

    this.addListener("socket-connected", () => {
      this.activateControls()
    })

    this.grabUiElements()
  }

  public begin() {
    this.setBrickColor({ red: 0xff, green: 0xff, blue: 0xff })
    this.reconnect(() => {
      this.addBrickControllerListeners()
      // this.activateControls()
    })
  }

  public setBrickColor(color: BrickColor) {
    this.brickColor = color
  }

  private grabUiElements() {
    this.rowNumberElement = document.querySelector("#row-number")
    this.brickButtonElement = document.querySelector("#brick-button")
  }



  private addBrickControllerListeners() {
    console.log("Adding listeners")
    // TODO: move these generic listeners to the base class and add hooks for adding more listeners from the subclasses
    this.addMessageHandler(this.controllerMessageHandler.bind(this))

    this.brickButtonElement?.addEventListener("click", this.sendBrickCommand.bind(this))
  }


  public sendBrickCommand() {
    debugger
    if (this.registerationInformation.id) {

      let brickColor = Uint8Array.from([this.brickColor.red, this.brickColor.green, this.brickColor.blue])
      // let view = this.messageBuilder.build(messageTypeEnum.ADD_BRICK, brickColor)

      this.sendMessage(messageTypeEnum.ADD_BRICK, brickColor)
    }
  }

  private async controllerMessageHandler(messageArray: ReturnMessagePayloadType) {
    // if (this.verboseLogging) {
    //   console.log("===> Message from the server <===")
    //   console.log(`Message type: ${messageArray.type}`)
    //   console.log(`Message: ${messageArray.data}`)
    //   console.log("=================================")
    // }

    // debugger
    // TODO: FIGURE OUT WHY THIS IS BEING CALLED TWICE ON REGISTER
    switch (messageArray?.constructor) {
      case ClientRegisteredPayload:
        this.activateControls()
        break
      // case messageTypeEnum.GAME_FRAME:
      //   console.log("add game frame handler")
      //   break
    }
  }


  private activateControls() {
    if (this.rowNumberElement) {
      this.rowNumberElement.innerHTML = `Row: ${this.registerationInformation.row}`
      this.brickButtonElement?.classList.remove("disabled")
      this.brickButtonElement?.removeAttribute("disabled")
    }
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
