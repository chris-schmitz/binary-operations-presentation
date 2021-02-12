import { clientTypeEnum, messageTypeEnum } from "../../project-common/Enumerables";
import { serverHostUrl } from "../common/config.json";
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { RegisteredClientMessage, ServerResponse, BrickColor } from "../common/Interfaces";

let websocketServerUrl = `ws://${serverHostUrl}`



class WebsocketClientManager {

  socket?: WebSocket
  websocketUrl: string

  attemptReconnect: boolean

  verboseLogging: boolean

  registerationInformation: {
    row: number | null
    id: Uint8Array | null
  }

  brickColor: BrickColor = { red: 0xff, green: 0x00, blue: 0x00 }

  rowNumberElement: Element | null = null
  brickButtonElement: Element | null = null
  messageBuilder: ClientMessageBuilder

  constructor(websocketUrl: string, messageBuilder: ClientMessageBuilder, attemptReconnect = true, verboseLogging = true) {
    this.websocketUrl = websocketUrl
    this.attemptReconnect = attemptReconnect
    this.verboseLogging = verboseLogging
    this.messageBuilder = messageBuilder

    this.registerationInformation = {
      id: null,
      row: null
    }

    this.grabUiElements()
  }
  public reconnect() {
    this.socket = new WebSocket(this.websocketUrl)
    this.addListeners()
  }

  public setBrickColor(color: BrickColor) {
    this.brickColor = color
  }

  private grabUiElements() {
    this.rowNumberElement = document.querySelector("#row-number")
    this.brickButtonElement = document.querySelector("#brick-button")
  }

  private registerClient() {
    const buffer = new Uint8Array(new ArrayBuffer(2))
    buffer[0] = clientTypeEnum.BRICK_CONTROLLER
    buffer[1] = messageTypeEnum.REGISTER_CLIENT
    this.socket?.send(buffer)
  }


  private addListeners() {
    this.socket?.addEventListener("close", this.closeListener.bind(this))
    this.socket?.addEventListener("open", this.openListener.bind(this))
    this.socket?.addEventListener("error", this.errorListener.bind(this))
    this.socket?.addEventListener("message", this.messageListener.bind(this))

    this.brickButtonElement?.addEventListener("click", this.sendBrickCommand.bind(this))
  }

  public sendBrickCommand() {
    if (this.registerationInformation.id) {

      let brickColor = Uint8Array.from([this.brickColor.red, this.brickColor.green, this.brickColor.blue])
      let view = this.messageBuilder.build(messageTypeEnum.ADD_BRICK, brickColor)

      console.log(view)
      this.socket?.send(view)
    }
  }

  private async messageListener(messageEvent: MessageEvent) {
    if (this.verboseLogging) {
      console.log("===> Message from the server <===")
      console.log(`Message type: ${messageEvent.type}`)
      console.log(`Message: ${messageEvent.data}`)
      console.log("=================================")
    }

    const uint8Array = new Uint8Array(await messageEvent.data.arrayBuffer())
    switch (uint8Array[0]) {
      case messageTypeEnum.CLIENT_REGISTERED:
        this.storeRegistration(uint8Array)
        break
    }
  }

  private storeRegistration(registerationInformation: Uint8Array) {
    this.registerationInformation.row = registerationInformation[1]
    this.registerationInformation.id = registerationInformation.slice(2, 6) // TODO: rip out after moving all messaging to the message builder
    this.messageBuilder.setId(registerationInformation.slice(2, 6))


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

  private openListener(openEvent: any) {
    if (this.verboseLogging) {
      console.log("===> Websocket connection open. <===")
      console.log(`Open target: ${openEvent.target}`)
      console.log("====================================")

      this.registerClient()
    }
  }

  private closeListener(closeEvent: any) {
    if (this.verboseLogging) {
      console.log("===> Websocket connection closed. <===")
      console.log(`Close was clean: ${closeEvent.wasClean}`)
      console.log(`Close event code: ${closeEvent.code}`)
      console.log(`Close event reason: ${closeEvent.reason}`)
      console.log("======================================")
    }

    if (this.attemptReconnect) {
      console.log("Attempting reconnect")
      this.reconnect()
    }
  }

  private errorListener(errorEvent: any) {
    console.log("===> There was an error with the websocket connection <===")
    console.log(`Error: ${errorEvent.error}`)
    console.log(`Error type: ${errorEvent.type}`)
    console.log(`Error message: ${errorEvent.message}`)
    console.log("==========================================================")

  }
}



export { WebsocketClientManager, ClientMessageBuilder, clientTypeEnum, websocketServerUrl }
