
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { websocketServerUrl } from "project-common/config.json";
import { clientTypeEnum, messageTypeEnum } from "project-common/Enumerables";
import WebsocketClientManager, { ClientEvents, ReconnectConfig, ReturnMessagePayloadType } from "../common/WebsocketClientManager";


const connectionTimeoutDuration = 1000

class GameBoard extends WebsocketClientManager {

  gridElement: HTMLTableSectionElement | null = null

  // * Hardcoding to 8x8 so it works on the physical matricies
  rows = 8
  columns = 8
  animationInterval = 100
  gameFrames = []
  messageBuilder: ClientMessageBuilder;

  constructor(websocketUrl: string, messageBuilder: ClientMessageBuilder, reconnectConfig?: ReconnectConfig) {
    super(websocketUrl, clientTypeEnum.GAMEBOARD, messageBuilder, reconnectConfig)
    this.messageBuilder = messageBuilder
    this.addListener(ClientEvents.GAME_FRAME.toString(), this.renderStateFrame.bind(this))
  }


  async begin() {
    try {
      this.reconnect(() => {
        this.addMessageHandler(this.messageHandler.bind(this))
      })
      this.grabElements()
      this.populateGrid()
    } catch (error) {
      console.error(error)
    }
  }

  grabElements() {
    this.gridElement = document.querySelector('tbody')
  }

  populateGrid() {
    for (let rowIterator = 0; rowIterator < this.rows; rowIterator++) {
      this.gridElement?.appendChild(this.createARow())
    }
  }

  createARow() {
    const row = document.createElement('tr')
    for (let columnIterator = 0; columnIterator < this.columns; columnIterator++) {
      const cell = document.createElement('td')
      cell.setAttribute('column', columnIterator.toString())
      row.appendChild(cell)
    }
    return row
  }


  async messageHandler(message: ReturnMessagePayloadType) {
    // TODO: add in conditional checks for data type
    console.log('received a message from the server')
    console.log(message)

    // * we'll need to change this up after ripping out the ReturnMessagePayloadType stuff
    if (message instanceof Uint8Array) {

      const justRows = message.slice(5, message.length)

      // this.renderStateFrame(justRows)
    }

  }

  renderStateFrame(frameData: Uint32Array) {
    const bitValue = (bit: number) => 1 << bit

    if (!this.gridElement) return

    for (let row = 0; row < 8; row++) {
      let color = 0xFFFFFF & frameData[row]

      // TODO: fit into the overall process
      const blue = color & 0xFF
      color >>= 8
      const green = color & 0xFF
      color >>= 8
      const red = color & 0xFF


      frameData[row] >>= 24
      const state = frameData[row]
      for (let cell = 0; cell < 8; cell++) {
        if ((state & bitValue(cell)) != 0) {
          this.gridElement.rows[row].cells[cell].style.backgroundColor = `rgb(${red}, ${green}, ${blue})`
        } else {
          this.gridElement.rows[row].cells[cell].style.backgroundColor = ""
        }
      }
    }
    // for (let row = 0; row < 8; row++) {
    //   for (let bitPlace = 0; bitPlace < 8; bitPlace++) {
    //     let cellState = uint8Array[row] & bitValue(bitPlace)
    //     let cellColor = uint8Array[row + 8] & bitValue(bitPlace)
    //     if (!this.gridElement) return

    //     if (cellState != 0) {
    //       this.gridElement.rows[row].cells[bitPlace].style.backgroundColor = "#" + cellColor.toString(16)
    //     } else {
    //       this.gridElement.rows[row].cells[bitPlace].style.backgroundColor = ""
    //     }
    //   }
    // }
  }

}


export { GameBoard }