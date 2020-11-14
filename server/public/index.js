// TODO:
// * - detect collision

// TODO: consider
// * - Create classes:
// *    - Game
// *    - UI manager (handles the html)
// *    - State manager (handles the html)
// * - Game class takes ui and state manager instances as dependencies
class GridManager {
  gridElement = null
  RandomBrickToggleButton = null

  /**
   * The HTML elements used to show the current state of the arrow keys
   *
   * @memberof GridManager
   */
  keyIndicators = {
    up: null,
    down: null,
    left: null,
    right: null,
  }

  /**
   * The current state of the arrow keys represented as a nibble.
   *
   * @memberof GridManager
   */
  activeKeys = 0b0000
  keyStates = []

  // * "enumns" key state indexes
  KEY_LEFT = 0b0010
  KEY_UP = 0b1000
  KEY_RIGHT = 0b0001
  KEY_DOWN = 0b0100

  SMALLEST_ARROW_KEY_CODE = 37 // i.e. the left arrow key's keyCode

  randomBricksOn = false
  gridState = []
  rows = 0
  columns = 0

  frameInterval = 1000
  animationIntervalContainer = null
  randomBrickIntervalContainer = null

  playerPosition = {
    rowIndex: 0, // ! calc according to number of rows
    columnState: 0, // * represented as a binary number
  }

  // TODO: ripout after playerPosition is working
  player = {
    current: {
      row: 0,
      column: 0,
    },
    previous: {
      row: 0,
      column: 0,
    },
  }

  constructor(rows, columns) {
    this.setKeyStateOrder()
    this.rows = rows
    this.columns = columns
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
    this.playerPosition.rowIndex = Math.floor(this.rows / 2)
    // * We're starting the player character at the far right of the grid
    // * and because we're representing the player position in binary, that's just a 1 :)
    this.playerPosition.columnState = 0b1
  }

  begin() {
    this.grabElements()
    this.addHooks()
    this.populateGrid()
    this.paintPlayer()
    this.startAnimation()
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
    this.gridState[rowIndex] = this.gridState[rowIndex] | 1
    this.paintCell(rowIndex, 0, true)
  }

  playerKeydownHandler(event) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return
    // TODO: move to global spot, use to back enums
    // TODO: also reorder so that the values are consecutive after testing

    // TODO: some thing

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
    // ! it could be argued as accetable considering we're repainting a section of the screen on a
    // ! regular basis and taking in user input for player movement.
    // ! Ultimately, it's a cool strategy that does have performance advantages, but consider your use
    // ! case and the dev-experience for devs in the future.
    const keyStateIndex = event.keyCode - this.SMALLEST_ARROW_KEY_CODE

    // ? Leaving this in to show the different approach
    // let triggeredKey = 0b0000
    // switch (event.code) {
    //   case 'ArrowUp':
    //     triggeredKey = 0b1000
    //     break
    //   case 'ArrowDown':
    //     triggeredKey = 0b0100
    //     break
    //   case 'ArrowLeft':
    //     triggeredKey = 0b0010
    //     break
    //   case 'ArrowRight':
    //     triggeredKey = 0b0001
    //     break
    // }

    this.activeKeys = this.activeKeys | this.keyStates[keyStateIndex]
    this.updateActiveKeyDisplay()
  }

  playerKeyupHandler(event) {
    // * leaving the early exit in with the string names for a more readable conditional
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return

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

  oldmovePlayer(event) {
    this.player.previous.row = this.player.current.row
    this.player.previous.column = this.player.current.column

    switch (event.code) {
      case 'ArrowUp':
        this.player.current.row--
        break
      case 'ArrowDown':
        this.player.current.row++
        break
      case 'ArrowLeft':
        this.player.current.column--
        break
      case 'ArrowRight':
        this.player.current.column++
        break
    }

    this.paintPlayer()
  }

  // TODO: merge with paintCell
  paintPlayer() {
    const targetRow = this.gridElement.children[this.playerPosition.rowIndex]
    targetRow.children[targetRow.childElementCount - Math.log(this.playerPosition.columnState) / Math.log(2) - 1].setAttribute(
      'paint-player',
      true
    )

    // .children[this.columns - this.playerPosition.co].removeAttribute('paint-player')

    // this.gridElement.children[this.player.previous.row].children[this.player.previous.column].removeAttribute('paint-player')
    // this.gridElement.children[this.player.current.row].children[this.player.current.column].setAttribute('paint-player', 'true')
  }

  paintCell(row, column, state) {
    this.gridElement.children[row].children[column].setAttribute('paint', state)
  }

  paintFrame() {
    for (let rowIterator = 0; rowIterator < this.gridState.length; rowIterator++) {
      const row = this.gridElement.children[rowIterator]
      for (let columnIterator = 0; columnIterator < this.columns; columnIterator++) {
        const cellState = Math.pow(2, columnIterator) & this.gridState[rowIterator]
        this.paintCell(rowIterator, columnIterator, cellState !== 0)
      }
    }
  }

  animate() {
    for (let i = 0; i < this.gridState.length; i++) {
      this.gridState[i] = this.gridState[i] << 1
      // Mask off the numbers so theyt don't just continually grow once the bricks are "off" the grid
      this.gridState[i] = this.gridState[i] & (Math.pow(2, this.columns) - 1)
    }
    this.paintFrame()
  }

  updateActiveKeyDisplay() {
    // TODO: move to global spot, use to back enums
    this.keyIndicators.up.setAttribute('key-active', (this.activeKeys & 0b1000) > 0)
    this.keyIndicators.down.setAttribute('key-active', (this.activeKeys & 0b0100) > 0)
    this.keyIndicators.left.setAttribute('key-active', (this.activeKeys & 0b0010) > 0)
    this.keyIndicators.right.setAttribute('key-active', (this.activeKeys & 0b0001) > 0)
  }
}

const gridManager = new GridManager(8, 10)

document.addEventListener('readystatechange', () => {
  if (document.readyState === 'complete') {
    gridManager.begin()
    window.gridManager = gridManager // ! leaving in for debugging and demo purposes
  }
})
