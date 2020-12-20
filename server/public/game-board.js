class GridManager {
  // * HTML elements
  gameState = null
  gridElement = null
  randomBrickToggleButton = null
  restartButton = null
  gridStateOutputBinary = null
  playerStateOutput = null

  keyIndicators = {
    up: null,
    down: null,
    left: null,
    right: null,
  }

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
  frameInterval = 800
  animationIntervalContainer = null
  randomBrickIntervalContainer = null

  // * Player properties
  startingHealth = 0
  player = {
    rowIndex: 0,
    columnState: 0, // * managed as a binary number to represent state
    health: 0,
  }

  decrementHealthOnCollision = true

  constructor(rows, columns, playerHealth) {
    this.rows = rows
    this.columns = columns
    this.player.health = this.startingHealth = playerHealth

    this.setKeyStateOrder()
    this.resetGridState()
    this.initializePlayerState()
  }

  /**
   * Sets or resets the number representation of the grid and blocks within.
   *
   * We want to start with no-bricks, so the state for everything should be 0.
   */
  resetGridState() {
    this.gridState = []
    for (let i = 0; i < this.rows; i++) {
      this.gridState.push(0)
    }
  }

  /**
   * Sets the starting position of the player based on the size of the grid.
   */
  initializePlayerState() {
    // * Start the player character half way through the rows
    this.player.rowIndex = Math.floor(this.rows / 2)
    // * We're starting the player character at the far right of the grid
    // * and because we're representing the player position in binary, that's just a 1 :)
    this.player.columnState = 0b1
  }

  /**
   * Stores references to all of the HTML elements used in the UI.
   */
  grabElements() {
    this.gridElement = document.querySelector('tbody')
    this.buttonWrapper = document.querySelector('#row-brick-buttons')
    this.randomBrickToggleButton = document.querySelector('#random-block-toggle')
    this.restartButton = document.querySelector('#restart')
    this.keyIndicators.up = document.querySelector('#up-key-indicator')
    this.keyIndicators.down = document.querySelector('#down-key-indicator')
    this.keyIndicators.left = document.querySelector('#left-key-indicator')
    this.keyIndicators.right = document.querySelector('#right-key-indicator')
    this.gameState = document.querySelector('#game-state')

    this.gridStateOutputBinary = document.querySelector('#grid-state-output-binary')
    this.gridStateOutputDecimal = document.querySelector('#grid-state-output-decimal')
    this.playerStateOutput = document.querySelector('#player-state-output')
    this.collisionIndicator = document.querySelector('.collision-indicator')
  }

  /**
   * Adds event listeners to various html elements.
   */
  addHooks() {
    document.addEventListener('keydown', this.playerKeydownHandler.bind(this))
    document.addEventListener('keyup', this.playerKeyupHandler.bind(this))

    this.restartButton.addEventListener('click', this.restartGame.bind(this))

    this.randomBrickToggleButton.addEventListener('click', () => {
      if (this.randomBricksOn) {
        this.stopRandomBricks()
      } else {
        this.startRandomBricks()
      }
    })
  }

  /**
   * Kicks off the game setup once the dom is ready.
   *
   * Note that this is different than the concept of reseting an already running game.
   */
  begin() {
    this.grabElements()
    this.setGameState('Playing')
    this.addHooks()
    this.populateGrid()
    this.paintPlayer()
    this.startBrickAnimation()
  }

  /**
   * Sets the dom element that shows the State of the game.
   * e.g. "Playing" vs "Game Over"
   *
   * @param {string} label The text you want to set the game state to.
   */
  setGameState(label) {
    this.gameState.innerText = label
  }

  /**
   * Sets the order of the keys that we're listening for.
   *
   * Note that this is only really needed because of how we're handling the key listeners with branchless code.
   */
  setKeyStateOrder() {
    this.keyStates = [this.KEY_LEFT, this.KEY_UP, this.KEY_RIGHT, this.KEY_DOWN]
  }

  /**
   * Starts the animation interval that drives the bricks.
   */
  startBrickAnimation() {
    if (this.animationIntervalContainer) {
      // * if the interval is already running, no need to start it again
      return
    }
    this.animationIntervalContainer = setInterval(this.animateBrickState.bind(this), this.frameInterval)
  }

  /**
   * The interval that the animation should run at. I.e. Frames per second (kind of).
   * @param {Number} rate The number in milliseconds
   */
  setBrickAnimationFrameRate(rate) {
    this.frameInterval = rate
    this.stopBrickAnimation()
    this.startBrickAnimation()

    if (this.randomBrickIntervalContainer !== null) {
      this.stopRandomBricks()
      this.startRandomBricks()
    }
  }

  /**
   * Clears the animation interval which stops the bricks.
   */
  stopBrickAnimation() {
    clearInterval(this.animationIntervalContainer)
    this.animationIntervalContainer = null
  }

  /**
   * Starts the automatic generation of bricks in random rows.
   */
  startRandomBricks() {
    if (this.randomBrickIntervalContainer) {
      // * if the interval is already running, no need to start it again
      return
    }
    this.randomBricksOn = true
    this.randomBrickToggleButton.classList.add('button-toggle-on')

    const bricksPerFrame = 3
    this.randomBrickIntervalContainer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * this.gridState.length)
      this.addBrick(randomIndex)
    }, this.frameInterval / bricksPerFrame)
  }

  /**
   * Stops the automatic generation of random bricks.
   */
  stopRandomBricks() {
    clearInterval(this.randomBrickIntervalContainer)
    this.randomBricksOn = false
    this.randomBrickToggleButton.classList.remove('button-toggle-on')
    this.randomBrickIntervalContainer = null
  }

  /**
   * Builds UI for the grid based on the row and grid count specified.
   *
   * TODO: come back and extract pieces needed to make the grid size updatable
   */
  populateGrid() {
    for (let rowIterator = 0; rowIterator < this.rows; rowIterator++) {
      const row = document.createElement('tr')
      for (let columnIterator = 0; columnIterator < this.columns; columnIterator++) {
        const cell = document.createElement('td')
        cell.setAttribute('column', columnIterator)
        row.appendChild(cell)
      }
      this.gridElement.appendChild(row)

      // TODO extract to named method
      const listItem = document.createElement('li')
      const button = document.createElement('button')
      button.addEventListener('click', () => gridManager.addBrick(rowIterator))
      button.innerText = `Row: ${rowIterator + 1}`
      listItem.appendChild(button)
      this.buttonWrapper.appendChild(listItem)
    }
  }

  /**
   * Adds a single brick to a row that will be picked up by the next frame render.
   *
   * @param {Number} rowIndex The row number to add a single brick to.
   */
  addBrick(rowIndex) {
    // * Note that we're not adding 1 to the beginning of our state, we're performing a bitwise `OR` on it.
    // * So, regardless of the state of the first bit of our state, we're setting it to `1`,
    // * This way we don't accidentally push more bricks into our row if we accidentally multi-click the button
    // * before the next frame paint. You can think of this as a way of debouncing the button until the next frame.
    this.gridState[rowIndex] = this.gridState[rowIndex] | Math.pow(2, this.columns - 1)
    this.paintBrick(rowIndex, 0, true)
  }

  /**
   * Logic for moving the player when the player hits one of the arrow keys.
   *
   * Note that this allows for multi-press support.
   *
   * @param {keydown} event The keydown event from the keyboard
   */
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

  /**
   * Updates the player position to note a key being lifted.
   *
   *
   * @param {keyup} event The keyup event from the keyboard.
   */
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

  /**
   * Decrementing the player health if we're tracking collisions between the player and the bricks.
   */
  decrementPlayerHealth() {
    if (!this.decrementHealthOnCollision) return

    this.player.health--
    if (this.player.health <= 0) {
      this.triggerGameOver()
    }
  }

  /**
   * Removes the player visually from the grid.
   */
  clearPlayer() {
    this.gridElement.querySelector('[paint-player]')?.removeAttribute('paint-player')
  }

  /**
   * Paints the player on the grid based on the current player position state
   */
  paintPlayer() {
    // ^ It's so funny, I was running through different ways of efficiently clear the old player position visually. None of the
    // ^ bitwise operation approaches seemed to be a good option because the paint timing would be tricky with the brick paint timing.
    // ^ Then I remembered I was using the DOM and denoting the player visually via an attribute ... so I could just query and remove it :P
    // ! Note that if we do a player size greater than 1 brick we'll need to change this a bit.
    this.clearPlayer()
    const targetRow = this.gridElement.children[this.player.rowIndex]
    targetRow.children[targetRow.childElementCount - Math.log(this.player.columnState) / Math.log(2) - 1].setAttribute(
      'paint-player',
      true
    )
  }

  /**
   * Painting the brick onto the grid UI.
   *
   * @param {Number} row The row to paint the brick
   * @param {Number} column The column to paint the brick
   * @param {Boolean} state How to paint the brick, either on or off
   */
  paintBrick(row, column, state) {
    this.gridElement.children[row].children[column].setAttribute('paint', state)
  }

  /**
   * Paints all of the bricks for the current frame given the grid state.
   */
  paintFrame() {
    for (let rowIterator = 0; rowIterator < this.gridState.length; rowIterator++) {
      for (let columnIterator = 0; columnIterator < this.columns; columnIterator++) {
        const cellState = Math.pow(2, columnIterator) & this.gridState[rowIterator]
        this.paintBrick(rowIterator, this.columns - columnIterator - 1, cellState !== 0)
      }
    }
  }

  /**
   * Animates brick STATE across the grid based on the grid state.
   *
   * Note that this is decoupled from actually painting the bricks onto the grid
   */
  animateBrickState() {
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

  /**
   * Determines if the player and brick occupy the same cell in the grid.
   */
  // TODO: come back and annotate and cleanup
  detectCollisions() {
    const colissions = this.player.columnState & this.gridState[this.player.rowIndex]

    if (colissions) {
      const gridColumn = this.columns - Math.log(colissions) / Math.log(2)
      this.collisionIndicator.classList.add('indicator-active')

      // TODO: abstract
      this.decrementPlayerHealth()
      this.player.columnState >>= 1
      if (this.player.columnState == 0) {
        this.clearPlayer()
        this.triggerGameOver()
        return
      } else {
        this.paintPlayer()
      }

      console.log(`Colission at row ${this.player.rowIndex + 1}, column ${gridColumn}`)
    } else {
      this.collisionIndicator.classList.remove('indicator-active')
    }

    this.updateStateOutput()
  }

  /**
   * **UTILITY METHOD**
   *
   * Draw the various states to the dom. Not needed for the game, just helpful for the demo and debugging.
   */
  updateStateOutput() {
    // this.gridStateOutput.innerText = this.gridState.map((row) => `\n${row.toString(2)}`)

    this.gridStateOutputBinary.innerText = this.gridState
      .map((row) => `${row.toString(2)}`)
      .map((row) => {
        function pad(i) {
          if (i > 0) {
            return '0' + pad(i - 1)
          }
          return '0'
        }
        let state = pad(this.columns - row.length - 1) + row
        return `\n${state}`
      })

    this.gridStateOutputDecimal.innerText = this.gridState.map((row) => `\n${row}`)

    this.playerStateOutput.innerText = JSON.stringify(this.player)
  }

  /**
   * **UTILITY METHOD**
   *
   * Draws the active arrow key to the screen. Not needed for the game, just another helpful visual.
   */
  updateActiveKeyDisplay() {
    // TODO: move to global spot, use to back enums
    this.keyIndicators.up.setAttribute('key-active', (this.activeKeys & 0b1000) > 0)
    this.keyIndicators.down.setAttribute('key-active', (this.activeKeys & 0b0100) > 0)
    this.keyIndicators.left.setAttribute('key-active', (this.activeKeys & 0b0010) > 0)
    this.keyIndicators.right.setAttribute('key-active', (this.activeKeys & 0b0001) > 0)
  }

  /**
   * Resets the game states, the grid UI, and starts the game play over.
   */
  restartGame() {
    this.player.health = this.startingHealth
    this.enableArrowKeys = true

    this.setGameState('Playing')
    this.showGameOverGraphics(false)
    this.clearAllBricks()
    this.initializePlayerState()
    this.paintPlayer()
    this.resetGridState()
    this.startRandomBricks()
    this.startBrickAnimation()
  }

  /**
   * Stops the gameplay, locks the arrow keys, and updates the UI to show that the game has ended.
   */
  triggerGameOver() {
    clearInterval(this.animationIntervalContainer)
    this.stopRandomBricks()
    this.setGameState('Game Over')
    this.showGameOverGraphics()
    this.stopBrickAnimation()
    this.enableArrowKeys = false
  }

  /**
   * Removes all bricks from the grid UI.
   *
   * **Note** that this is not the same as resetting the brick state (though it prob should be linked :|)
   */
  clearAllBricks() {
    document.querySelectorAll('[paint = true]').forEach((cell) => cell.setAttribute('paint', false))
  }

  /**
   * Updates the UI with to either show or hide the game over visual elements.
   *
   * @param {Boolean} status Whether or not to show the game over graphics
   */
  showGameOverGraphics(status = true) {
    if (status) {
      this.gridElement.classList.add('game-over')
      this.gameState.classList.add('game-over')
    } else {
      this.gridElement.classList.remove('game-over')
      this.gameState.classList.remove('game-over')
    }
  }
}

const gridManager = new GridManager(8, 8, 10)

/**
 * * All of the websocket stuff
 * * I'm keeping all of this out of the grid manager for a couple of reasons:
 * ? - The grid manager is already waaay way to big and should def be broken out into subclasses
 * ? - In the final version of this code the grid manager is going to get broken up and the state management
 * ?    will be moved up to the server. Knowing that I want to keep the Communication stuff separate.
 */

const socket = new WebSocket('ws://localhost:3001')
socket.addEventListener('open', () => console.log('connected to socket server'))
socket.addEventListener('close', () => console.log('disconnected from socket server'))
socket.addEventListener('error', (error) => {
  console.log('Websocket server error:')
  console.log(error)
})

/**
 * Takes in the binary state of the touch controller and creates bricks in the first 12 rows based on that state.
 *
 * @param {Number} data The 12 bit state of the touch controller
 */
async function touchControllerMessageHandler(data) {
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
}

/**
 * The web controllers are tied to one specific row. This handler adds a brick for the current frame to
 * the controllers assigned row.
 *
 * @param {Number} rowIndex The row that a brick should be added to
 */
function webControllerMessageHandler(rowIndex) {
  gridManager.addBrick(rowIndex)
}

const messageTypeMask = 0xff
const touchStateMask = 0xfff

/**
 * Pulls the message type and data out of the numeric message from the touch controller.
 *
 * @param {Number} message The message data and type combined into a single binary string.
 */
function parseMessageTypeAndData(message) {
  const type = message & messageTypeMask
  message >>= 8
  const data = message
  return { type, data }
}

/**
 * Handler for any messages coming from the websocket server.
 */
socket.addEventListener('message', async (message) => {
  const { data: payload } = message

  let type = null
  let data = null

  if (payload instanceof Number) {
    const number = Number(payload)
    ;({ type, data } = parseMessageTypeAndData(number))
  } else if (payload instanceof Blob) {
    const buffer = await payload.arrayBuffer()
    ;[type, data] = new Uint8Array(buffer)
  } else {
    console.error("we don't have a handler for the message.")
    console.log(message)
  }

  switch (type) {
    case 0b01:
      webControllerMessageHandler(data)
      break
    case 0b10:
      touchControllerMessageHandler(data)
      break
  }
})

/**
 * Waiting for the dom to be ready before kicking everything off.
 */
document.addEventListener('readystatechange', () => {
  if (document.readyState === 'complete') {
    gridManager.begin()
    window.gridManager = gridManager // ! leaving in for debugging and demo purposes
  }
})
