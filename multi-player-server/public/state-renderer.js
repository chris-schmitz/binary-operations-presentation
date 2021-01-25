const websocketServerUrl = 'ws://cs-touchscreen.local:3001'
// const websocketServerUrl = 'ws://localhost:3000'
const connectionTimeoutDuration = 1000

class StateRenderer {
  connection = null
  reconnectAttemptTotal = 10
  reconnectionAttemptCount = 0

  gridElement = null

  // * Hardcoding to 8x8 so it works on the physical matricies
  rows = 8
  columns = 8
  animationInterval = 100
  gameFrames = []

  async initalize() {
    try {
      this.grabElements()
      this.populateGrid()
      await this.connectToWebsocketServer()
      this.attachListeners()
      this.registerAsGameBoard()
    } catch (error) {
      console.error(error)
    }
  }

  grabElements() {
    this.gridElement = document.querySelector('tbody')
  }

  populateGrid() {
    for (let rowIterator = 0; rowIterator < this.rows; rowIterator++) {
      this.gridElement.appendChild(this.createARow())
    }
  }

  createARow() {
    const row = document.createElement('tr')
    for (let columnIterator = 0; columnIterator < this.columns; columnIterator++) {
      const cell = document.createElement('td')
      cell.setAttribute('column', columnIterator)
      row.appendChild(cell)
    }
    return row
  }

  connectToWebsocketServer() {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(websocketServerUrl)
      console.log(`Websocket server connection attempt: ${this.reconnectionAttemptCount}`)

      setTimeout(() => {
        if (socket.readyState !== socket.OPEN) {
          this.reconnectionAttemptCount++
          if (this.reconnectionAttemptCount < this.reconnectAttemptTotal) {
            this.connectToWebsocketServer()
          } else {
            console.error('Unable to connect to the websocket server.')
            return reject()
          }
        }

        console.log('Connected to websocket server.')
        this.connection = socket
        resolve()
      }, connectionTimeoutDuration)
    })
  }

  attachListeners() {
    this.connection.addEventListener('error', this.errorHandler.bind(this))
    this.connection.addEventListener('close', this.closeHandler.bind(this))
    this.connection.addEventListener('message', this.messageHandler.bind(this))
  }

  registerAsGameBoard() {
    // TODO: consider how we should handle this.
    // * I don't think we need a UUID per board, they should all always get the same message
    // * controllers should have uuids
    // * and we should have block controllers vs a player controller
    this.connection.send("I'm a game board.")
  }

  async messageHandler(message) {
    // TODO: add in conditional checks for data type
    console.log('received a message from the server')
    console.log(message)
    try {
      const buffer = await message.data.arrayBuffer()
      const uint8tArray = new Uint8Array(buffer)
      this.renderStateFrame(uint8tArray)
    } catch (error) {
      console.error(error)
    }
  }

  renderStateFrame(uint8Array) {
    const bitValue = (bit) => 1 << bit

    for (let row = 0; row < 8; row++) {
      for (let bitPlace = 0; bitPlace < 8; bitPlace++) {
        let cellState = uint8Array[row] & bitValue(bitPlace)
        if (cellState != 0) {
          this.gridElement.rows[row].cells[bitPlace].setAttribute('paint', true)
        } else {
          this.gridElement.rows[row].cells[bitPlace].setAttribute('paint', false)
        }
      }
    }
  }

  closeHandler(closeEvent) {
    console.log("The socket's connection has closed. Attempting reconnect.")
    this.connectToWebsocketServer().catch((error) => {
      // TODO: refactor consideration
      // * should the caller report the error or the method itself?
      console.error(error)
    })
  }

  errorHandler(errorEvent) {
    console.error('The websocket client encountered an error:')
    console.log(errorEvent)
  }
}

const stateRenderer = new StateRenderer()

document.addEventListener('readystatechange', stateRenderer.initalize())
