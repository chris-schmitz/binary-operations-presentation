class GridManager {
  // * HTML elements
  gameState = null
  gridElement = null
  RandomBrickToggleButton = null

  keyIndicators = {
    up: null,
    down: null,
    left: null,
    right: null,
  }

  gridStateOutput = null
  playerStateOutput = null

  // * Arrow key input properties
  activeKeys = 0b0000
  keyStates = []
  // * "enums" key state indexes
  KEY_LEFT = 0b0010
  KEY_UP = 0b1000
  KEY_RIGHT = 0b0001
  KEY_DOWN = 0b0100
  enableArrowKeys = true

  SMALLEST_ARROW_KEY_CODE = 37 // * i.e. the left arrow key's keyCode

  // * Brick properties
  randomBricksOn = false
  gridState = []
  rows = 0
  columns = 0

  // * Animation properties
  frameInterval = 1000
  animationIntervalContainer = null
  randomBrickIntervalContainer = null

  // * Player properties
  player = {
    rowIndex: 0,
    columnState: 0, // * managed as a binary number to represent state
    health: 0,
  }

  constructor(rows, columns, playerHealth) {
    this.setKeyStateOrder()
    this.rows = rows
    this.columns = columns
    this.player.health = playerHealth
    this.initializeGridState()
    this.initializePlayerState()
  }
  initializeGridState() {
    for (let i = 0; i < this.rows; i++) {
      this.gridState.push(0)
    }
  }

  initializePlayerState() {
    // * Start the player character half way through the rows
    this.player.rowIndex = Math.floor(this.rows / 2)
    // * We're starting the player character at the far right of the grid
    // * and because we're representing the player position in binary, that's just a 1 :)
    this.player.columnState = 0b1
  }

  begin() {
    this.grabElements()
    this.setGameState('Playing')
    this.addHooks()
    this.populateGrid()
    this.paintPlayer()
    this.startAnimation()
  }

  setGameState(label) {
    this.gameState.innerText = label
  }

  /**
   *
   */
  setKeyStateOrder() {
    this.keyStates = [this.KEY_LEFT, this.KEY_UP, this.KEY_RIGHT, this.KEY_DOWN]
  }

  startAnimation() {
    if (this.animationIntervalContainer) {
      // * if the interval is already running, no need to start it again
      return
    }
    this.animationIntervalContainer = setInterval(this.animate.bind(this), this.frameInterval)
  }

  stopAnimation() {
    clearInterval(this.animationIntervalContainer)
    this.animationIntervalContainer = null
  }

  startRandomBricks() {
    if (this.randomBrickIntervalContainer) {
      // * if the interval is already running, no need to start it again
      return
    }
    this.randomBrickIntervalContainer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * this.gridState.length)
      this.addBrick(randomIndex)
    }, this.frameInterval)
  }

  stopRandomBricks() {
    clearInterval(this.randomBrickIntervalContainer)
    this.randomBrickIntervalContainer = null
  }

  grabElements() {
    this.gridElement = document.querySelector('tbody')
    this.buttonWrapper = document.querySelector('#button-wrapper')
    this.RandomBrickToggleButton = document.querySelector('#random-block-toggle')
    this.keyIndicators.up = document.querySelector('#up-key-indicator')
    this.keyIndicators.down = document.querySelector('#down-key-indicator')
    this.keyIndicators.left = document.querySelector('#left-key-indicator')
    this.keyIndicators.right = document.querySelector('#right-key-indicator')
    this.gameState = document.querySelector('#game-state')

    this.gridStateOutput = document.querySelector('#grid-state-output')
    this.playerStateOutput = document.querySelector('#player-state-output')
    this.collisionIndicator = document.querySelector('.collision-indicator')
  }

  addHooks() {
    document.addEventListener('keydown', this.playerKeydownHandler.bind(this))
    document.addEventListener('keyup', this.playerKeyupHandler.bind(this))

    this.RandomBrickToggleButton.addEventListener('click', () => {
      if (this.randomBricksOn) {
        this.randomBricksOn = false
        this.RandomBrickToggleButton.classList.remove('button-toggle-on')
        this.stopRandomBricks()
      } else {
        this.randomBricksOn = true
        this.RandomBrickToggleButton.classList.add('button-toggle-on')
        this.startRandomBricks()
      }
    })
  }

  populateGrid() {
    for (let rowIterator = 0; rowIterator < this.rows; rowIterator++) {
      const row = document.createElement('tr')
      for (let columnIterator = 0; columnIterator < this.columns; columnIterator++) {
        const cell = document.createElement('td')
        cell.setAttribute('column', columnIterator)
        row.appendChild(cell)
      }
      this.gridElement.appendChild(row)

      const button = document.createElement('button')
      button.addEventListener('click', () => gridManager.addBrick(rowIterator))
      button.innerText = `Row: ${rowIterator + 1}`
      this.buttonWrapper.appendChild(button)
    }
  }

  addBrick(rowIndex) {
    // * Note that we're not adding 1 to the beginning of our state, we're performing a bitwise `OR` on it.
    // * So, regardless of the state of the first bit of our state, we're setting it to `1`,
    // * This way we don't accidentally push more bricks into our row if we accidentally multi-click the button
    // * before the next frame paint. You can think of this as a way of debouncing the button until the next frame.
    this.gridState[rowIndex] = this.gridState[rowIndex] | Math.pow(2, this.columns - 1)
    // this.gridState[rowIndex] = this.gridState[rowIndex] | 1
    this.paintCell(rowIndex, 0, true)
  }

  // TODO: abstract some logic, there's a lot happening here that should be named
  playerKeydownHandler(event) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return
    if (!this.enableArrowKeys) return

    // * The key codes for:
    // ? left, up, right, down
    // * are:
    // ? 37, 38, 39, 40
    // * respectively, so if we want to get one of those codes and convert it to an index
    // * in our `keyStates` variable we just need to subtract the value of the lowest number
    // * which is 37. That way if we get left our index would be 0, up index would be 1, etc.
    // ! We could do this with a switch statement, but using this approach avoids branching
    // ! which gives a performance increase. That said, you're trading performance for readability,
    // ! so you have to decide if it's really called for. I'm showing it here for demo purposes and
    // ! it could be argued as acceptable considering we're repainting a section of the screen on a
    // ! regular basis and taking in user input for player movement.
    // ! Ultimately, it's a cool strategy that does have performance advantages, but consider your use
    // ! case and the dev-experience for devs in the future.
    const keyStateIndex = event.keyCode - this.SMALLEST_ARROW_KEY_CODE

    this.activeKeys = this.activeKeys | this.keyStates[keyStateIndex]
    this.updateActiveKeyDisplay()

    // * There are a couple of things worth noting here:
    // ? - There are no conditionals. This is an example of branchless coding. Avoiding conditionals can lead to better performance
    // ? - Here we're doing shift assignment (e.g. this.player.columnState <<= ...) to shorten the syntax
    // ? - Yeah this is compact, but is it more readable? This code could benefit from some abstraction to make what's happening a bit more obvious
    // ?    (I'm leaving it less abstract to make it easier to pull out and play with the pieces in the browser dev tools).
    this.player.columnState <<= +(
      (this.activeKeys & this.KEY_LEFT) !== 0 && this.player.columnState < Math.pow(2, this.columns - 1)
    )
    this.player.columnState >>= +((this.activeKeys & this.KEY_RIGHT) !== 0 && this.player.columnState > 1)
    this.player.rowIndex -= +((this.activeKeys & this.KEY_UP) !== 0 && this.player.rowIndex > 0)
    this.player.rowIndex += +((this.activeKeys & this.KEY_DOWN) !== 0 && this.player.rowIndex + 1 < this.rows)
    this.paintPlayer()
    this.detectCollisions()
  }

  playerKeyupHandler(event) {
    // * leaving the early exit in with the string names for a more readable conditional
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return
    if (!this.enableArrowKeys) return

    const keyStateIndex = event.keyCode - this.SMALLEST_ARROW_KEY_CODE

    // * e.g.: let's say our `this.keyStates[keyStateIndex]` value is
    // ? 0b1010
    // ! remember, this is the current
    // * using the XOR operation (^) with the mask of `0b1111` would say
    // ! Compare each number place in each value and do an "exclusive or" operation,
    // ! If the values are 0 0, use a 0 in that number place of the new number
    // ! If the values are 0 1, use a 1 in that number place of the new number
    // ! If the values are 1 0, use a 1 in that number place of the new number
    // ! If the values are 1 1, use a 0 in that number place of the new number
    // ? I.e. we want _exclusively_ one of the places to be true(1) and the other to be false(0)
    // * This logic applied with the mask of `0b1111` means our comparison operation looks like this:
    // ? 0b1010
    // ? 0b1111
    // ? 0b0101
    // * The _reverse_ of our value
    const mask = this.keyStates[keyStateIndex] ^ 0b1111

    // * and now with our mask
    this.activeKeys = this.activeKeys & mask
    this.updateActiveKeyDisplay()
  }

  decrementPlayerHealth() {
    this.player.health--
    if (this.player.health <= 0) {
      this.triggerGameOver()
    }
  }

  // TODO: merge with paintCell
  paintPlayer() {
    // ^ It's so funny, I was running through different ways of efficiently clear the old player position visually. None of the
    // ^ bitwise operation approaches seemed to be a good option because the paint timing would be tricky with the brick paint timing.
    // ^ Then I remembered I was using the DOM and denoting the player visually via an attribute ... so I could just query and remove it :P
    // ! Note that if we do a player size greater than 1 brick we'll need to change this a bit.
    this.gridElement.querySelector('[paint-player]')?.removeAttribute('paint-player')
    const targetRow = this.gridElement.children[this.player.rowIndex]
    targetRow.children[targetRow.childElementCount - Math.log(this.player.columnState) / Math.log(2) - 1].setAttribute(
      'paint-player',
      true
    )
  }

  paintCell(row, column, state) {
    this.gridElement.children[row].children[column].setAttribute('paint', state)
  }

  // TODO cleanup
  paintFrame() {
    for (let rowIterator = 0; rowIterator < this.gridState.length; rowIterator++) {
      for (let columnIterator = 0; columnIterator < this.columns; columnIterator++) {
        const cellState = Math.pow(2, columnIterator) & this.gridState[rowIterator]
        this.paintCell(rowIterator, this.columns - columnIterator - 1, cellState !== 0)
      }
    }
  }

  animate() {
    for (let i = 0; i < this.gridState.length; i++) {
      this.gridState[i] = this.gridState[i] >> 1
      // this.gridState[i] = this.gridState[i] << 1
      // * Mask off the numbers so they don't just continually grow once the bricks are "off" the grid
      this.gridState[i] = this.gridState[i] & (Math.pow(2, this.columns) - 1)
    }
    this.updateStateOutput()
    this.detectCollisions()
    this.paintFrame()
  }

  updateStateOutput() {
    this.gridStateOutput.innerText = this.gridState
    this.playerStateOutput.innerText = JSON.stringify(this.player)
  }

  // TODO: come back and annotate and cleanup
  detectCollisions() {
    const colissions = this.player.columnState & this.gridState[this.player.rowIndex]

    if (colissions) {
      const gridColumn = this.columns - Math.log(colissions) / Math.log(2)
      this.collisionIndicator.classList.add('indicator-active')
      this.decrementPlayerHealth()
      console.log(`Colission at row ${this.player.rowIndex + 1}, column ${gridColumn}`)
    } else {
      this.collisionIndicator.classList.remove('indicator-active')
    }

    this.updateStateOutput()
  }

  updateActiveKeyDisplay() {
    // TODO: move to global spot, use to back enums
    this.keyIndicators.up.setAttribute('key-active', (this.activeKeys & 0b1000) > 0)
    this.keyIndicators.down.setAttribute('key-active', (this.activeKeys & 0b0100) > 0)
    this.keyIndicators.left.setAttribute('key-active', (this.activeKeys & 0b0010) > 0)
    this.keyIndicators.right.setAttribute('key-active', (this.activeKeys & 0b0001) > 0)
  }

  triggerGameOver() {
    clearInterval(this.animationIntervalContainer)
    this.stopRandomBricks()
    this.setGameState('Game Over')
    this.gridElement.classList.add('game-over')
    this.gameState.classList.add('game-over')
    this.enableArrowKeys = false
  }
}

const gridManager = new GridManager(12, 10, 10)

// TODO: come back and clean this up. either add it as a new class or fold it into the eexisting class

const socket = new WebSocket('ws://localhost:3001')
socket.addEventListener('open', () => {
  console.log('connected to socket server')
})
socket.addEventListener('close', () => console.log('disconnected from socket server'))
socket.addEventListener('error', (error) => {
  console.log('Websocket server error:')
  console.log(error)
})

// TODO: refactor to allow this to accept the message `type` and the message `data`
async function touchControllerMessageHandler(type, data) {
  // TODO I dont' like how this feels. refactor and pull out to it's own function or method
  // switch (type) {
  //   case messageTypeMockEnum['add-single-brick']:
  //     gridManager.addBrick(data)
  //     break
  // case messageTypeMockEnum['touch-controller-state']:
  let maskBit = 0b1
  for (let i = 0; i < 12; i++) {
    let maskedData = data & maskBit

    console.log(maskBit.toString(2))
    console.log(maskedData.toString(2))

    if (maskedData > 0) {
      let rowIndex = Math.log(maskedData) / Math.log(2)
      gridManager.addBrick(rowIndex)
    }
    maskBit <<= 1
  }
  //     break
  // }
}

const messageTypeMockEnum = {
  'add-single-brick': 0b00000001,
  'touch-controller-state': 0b00000010,
}
const messageTypeMask = 0xff
const touchStateMask = 0xfff
function parseMessageTypeAndData(message) {
  const type = message & messageTypeMask
  message >>= 8
  const data = message
  return { type, data }
}

function byteArrayMessageHandler(byteArray) {
  console.log(byteArray)
  const type = byteArray[0]
  const message = byteArray[1]

  switch (type) {
    case 0b1:
      console.log('Message from web controller')
      gridManager.addBrick(message)
      break
    case 0b10:
      console.log('Message from touch controller')
      touchControllerMessageHandler(type, message)
      break
  }
}

// TODO: woof, refactor to clean this up. We need:
// * - a "parseMessage(message): {type, data}" function:
// ? - check the instance
// ? - parse for number
// ? - convert for blob
// ? - extracts and returns type and data regardless of instance
// * - hand off type and data to a single `messageHandler` function
socket.addEventListener('message', async (message) => {
  const { data } = message

  if (data instanceof Number) {
    const number = Number(data)

    const { type, data } = parseMessageTypeAndData(number)
    touchControllerMessageHandler(type, data)
  } else if (data instanceof Blob) {
    const buffer = await data.arrayBuffer()
    const view = new Uint8Array(buffer)

    byteArrayMessageHandler(view)
  } else {
    console.error("we don't have a handler for the message.")
    console.log(message)
  }
})

document.addEventListener('readystatechange', () => {
  if (document.readyState === 'complete') {
    gridManager.begin()
    window.gridManager = gridManager // ! leaving in for debugging and demo purposes
  }
})
