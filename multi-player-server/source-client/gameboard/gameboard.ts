
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { websocketServerUrl } from "project-common/config.json";
import { clientTypeEnum, messageTypeEnum } from "project-common/Enumerables";
import WebsocketClientManager, { ReconnectConfig, ReturnMessagePayloadType } from "../common/WebsocketClientManager";


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

      const justRows = message.slice(5, 13)

      this.renderStateFrame(justRows)
    }

  }

  renderStateFrame(uint8Array: Uint8Array) {
    // debugger
    const bitValue = (bit: number) => 1 << bit

    for (let row = 0; row < 8; row++) {
      for (let bitPlace = 0; bitPlace < 8; bitPlace++) {
        let cellState = uint8Array[row] & bitValue(bitPlace)
        if (cellState != 0) {
          this.gridElement?.rows[row].cells[bitPlace].setAttribute('paint', true.toString())
        } else {
          this.gridElement?.rows[row].cells[bitPlace].setAttribute('paint', false.toString())
        }
      }
    }
  }

}


export { GameBoard }