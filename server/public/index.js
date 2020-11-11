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

  keyIndicators = {
    up: null,
    down: null,
    left: null,
    right: null,
  }
  randomBricksOn = false
  gridState = []
  rows = 0
  columns = 0

  frameInterval = 1000
  animationIntervalContainer = null
  randomBrickIntervalContainer = null

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
    this.rows = rows
    this.columns = columns
    for (let i = 0; i < rows; i++) {
      this.gridState.push(0)
    }
  }

  begin() {
    this.grabElements()
    this.addHooks()
    this.populateGrid()
    this.paintPlayer()
    this.startAnimation()
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

  activeKeys = 0b0000
  playerKeydownHandler(event) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return

    let triggeredKey = 0b0000

    switch (event.code) {
      case 'ArrowUp':
        triggeredKey = 0b1000
        break
      case 'ArrowDown':
        triggeredKey = 0b0100
        break
      case 'ArrowLeft':
        triggeredKey = 0b0010
        break
      case 'ArrowRight':
        triggeredKey = 0b0001
        break
    }

    this.activeKeys = this.activeKeys | triggeredKey
    this.updateActiveKeyDisplay()
  }

  playerKeyupHandler(event) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return

    let triggeredKey = 0b1111

    switch (event.code) {
      case 'ArrowUp':
        triggeredKey = 0b0111
        break
      case 'ArrowDown':
        triggeredKey = 0b1011
        break
      case 'ArrowLeft':
        triggeredKey = 0b1101
        break
      case 'ArrowRight':
        triggeredKey = 0b1110
        break
    }

    this.activeKeys = this.activeKeys & triggeredKey
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
    this.gridElement.children[this.player.previous.row].children[this.player.previous.column].removeAttribute('paint-player')
    this.gridElement.children[this.player.current.row].children[this.player.current.column].setAttribute('paint-player', 'true')
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
