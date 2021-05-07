import { clientTypeEnum, messageTypeEnum } from "project-common/Enumerables";
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { ServerResponse } from "../common/Interfaces";
import WebsocketClientManager, { ClientEvents, ReconnectConfig } from "../common/WebsocketClientManager"
import { BrickColor } from "../common/BrickColor";

class BrickController extends WebsocketClientManager {

  verboseLogging: boolean

  brickColor: BrickColor

  rowNumberElement: Element | null = null
  brickButtonElement: HTMLButtonElement | null = null
  colorPicker: Element | null = null

  buttonLockTickCountTotal: number
  buttonLockTickCount: number = 0

  // * Note that there is a difference between locked and disableld 
  // * we could merge the two, but we want a different look for the two states
  // ? disabled = player doesn't have control of a row so they can't do anything (button grayed, disabled, and text shows 'waiting for turn')
  // ? locked = player has control over a row, but we're putting an arbitrary (and hackable) delay on them pushing the brick button 
  buttonIsLocked: boolean = false
  fireTextElement: HTMLElement | null = null
  shootSound: HTMLAudioElement | null = null

  constructor(websocketUrl: string, messageBuilder: ClientMessageBuilder, attemptReconnect?: ReconnectConfig, verboseLogging = true) {
    super(websocketUrl, clientTypeEnum.BRICK_CONTROLLER, messageBuilder, attemptReconnect)
    this.verboseLogging = verboseLogging
    this.brickColor = BrickColor.fromRGB({ red: 0, green: 0, blue: 0 })

    this.buttonLockTickCountTotal = 3

    this.grabUiElements()

    // window.addEventListener("beforeunload", () => {
    //   localStorage.removeItem("active")
    // })
  }

  public begin() {
    this.setBrickColor(this.brickColor)
    this.setButtonColor(this.brickColor)

    // if (localStorage.getItem("active") == "true") return
    this.reconnect(() => {
      // localStorage.setItem("active", "true")
      this.addBrickControllerListeners()
    })
  }

  private updateBrickColor(changeEvent: Event) {
    const target = changeEvent.target as HTMLInputElement
    let hexColor = parseInt(target.value.slice(1, target.value.length), 16) // ? chop off that `#` from the string
    const color = BrickColor.fromHex(hexColor)
    this.setBrickColor(color)
    this.setButtonColor(color)
  }
  setButtonColor(color: BrickColor) {
    if (!this.brickButtonElement) return
    this.brickButtonElement.style.backgroundColor = color.asCSS()
    this.brickButtonElement.setAttribute("value", color.asPrefixedHex())
  }

  public setBrickColor(color: BrickColor) {
    this.brickColor = color
  }

  private grabUiElements() {
    this.rowNumberElement = document.querySelector("#row-number")
    this.brickButtonElement = document.querySelector("#brick-button")
    this.fireTextElement = document.querySelector("#fire-text")
    this.colorPicker = document.querySelector("#color-picker")
    this.shootSound = document.querySelector("#shoot-sound")
    this.shootSound!.volume = 0.1

    if (!this.rowNumberElement || !this.brickButtonElement || !this.colorPicker) {
      throw new Error("Unable to grab UI elements!")
    }
  }


  private addBrickControllerListeners() {
    console.log("Adding listeners")
    this.addListener(ClientEvents.SOCKET_ERROR.toString(), (message) => {
      console.log("socket error:")
      console.log(message)
    })

    this.addListener(ClientEvents.GAME_TICK.toString(), this.buttonLockListener.bind(this))
    this.addListener(ClientEvents.BRICK_ROW_ASSIGNED.toString(), this.activateControls.bind(this))
    this.addListener(ClientEvents.WAITING_FOR_TURN.toString(), this.waitForTurn.bind(this))


    this.brickButtonElement?.addEventListener("click", this.sendBrickCommand.bind(this))
    this.colorPicker?.addEventListener("change", this.updateBrickColor.bind(this))
  }


  public sendBrickCommand() {
    if (this.registrationInformation.id) {

      this.shootSound?.play()

      // TODO: add the id to the send brick command so we can validate 
      const color = this.brickColor.asRGB()
      let brickColor = Uint8Array.from([color.red, color.green, color.blue])
      this.sendMessage(messageTypeEnum.ADD_BRICK, brickColor)

      this.lockButton()
    }
  }


  private waitForTurn() {
    this.rowNumberElement!.innerHTML = "Waiting for turn"
    this.brickButtonElement?.classList.add("disabled")
    this.brickButtonElement!.disabled = true
  }

  private buttonLockListener() {
    if (!this.buttonIsLocked) return

    this.buttonLockTickCount++
    if (this.buttonLockTickCount > this.buttonLockTickCountTotal) {
      this.buttonLockTickCount = 0
      this.unlockButton()
    }
  }

  private lockButton() {
    this.buttonIsLocked = true
    this.fireTextElement!.innerText = "Locked!"
    // this.brickButtonElement!.innerText = "locked"
    this.brickButtonElement!.disabled = true
  }
  private unlockButton() {
    this.buttonIsLocked = false
    this.fireTextElement!.innerText = "Fire!"
    this.brickButtonElement!.disabled = false
  }

  private activateControls(row: number) {
    this.rowNumberElement!.innerHTML = `Row: ${row}`
    this.brickButtonElement?.classList.remove("disabled")
    this.brickButtonElement?.removeAttribute("disabled")
    this.brickButtonElement!.disabled = false
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
    // ? a phone number it's `314 - 123 - 4567`. The way we interpret the data tells us the meaning
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
