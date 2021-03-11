
import ClientMessageBuilder from "../common/ClientMessageBuilder";
import { clientTypeEnum } from "project-common/Enumerables";
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

      // * For the frame data, each array element is a single number representing a row's state,
      // * Specifically, each number holds for bytes:
      // ^ RowState | RedValue | GreenValue | BlueValue
      // * And it would look something like this:
      // ^ frameRowData[i] == 2164239035 == 0x80ffaabb == 10000000 11111111 10101010 10111011
      // 
      // * So putting the bytes into a more tabular view:
      // ^ RowState | RedValue | GreenValue | BlueValue
      // ^ 10000000 | 11111111 | 10101010   | 10111011
      // 
      // * And we're taking the number apart from right to left using byte masking
      // * so when you see 
      // ^ const blue = color & 0xFF
      // * we're saying "do an AND comparison to all the bits in the `color` number to the number `0xFF` which is `11111111 in binary form"
      // ^ 10000000 11111111 10101010 10111011
      // ^ 00000000 00000000 00000000 11111111
      // * which gives us just the first byte from our number
      // ^ 00000000 00000000 00000000 10111011
      // 
      // * Then we shift our number right by 8 bits
      // ^ color >>= 8
      // ^ 00000000 10000000 11111111 10101010 
      // * and do the comparison again to get the next byte
      // ^ color green = color & 0xFF
      // ^ 00000000 10000000 11111111 10101010 
      // ^ 00000000 00000000 00000000 11111111
      // * which gives us 
      // ^ 00000000 00000000 00000000 10101010 
      // 
      // * And we keep doing that to pull out the rest of our bytes for red and then the row state

      let color = 0xFFFFFF & frameData[row]

      const blue = color & 0xFF
      color >>= 8
      const green = color & 0xFF
      color >>= 8
      const red = color & 0xFF


      frameData[row] >>= 24
      const state = frameData[row]
      for (let cell = 0; cell < 8; cell++) {
        if ((state & bitValue(cell)) != 0) {
          // ! we _should_ be able to set the style with a hex value, though I was having problems with it before. 
          // ! that said, deconstructing the 32 bit number here into 4 different bytes that mean different things 
          // ! is a pretty worthy binary operations example :)
          this.gridElement.rows[row].cells[cell].style.backgroundColor = `rgb(${red}, ${green}, ${blue})`
        } else {
          this.gridElement.rows[row].cells[cell].style.backgroundColor = ""
        }
      }
    }
  }

}


export { GameBoard }