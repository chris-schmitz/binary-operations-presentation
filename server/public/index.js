// TODO:
// * - detect collision
// * - Create classes:
// *    - Game
// *    - UI manager (handles the html)
// *    - State manager (handles the html)
// * - Game class takes ui and state manager instances as dependencies
class BrickMover {
  gridElement = null
  gridState = []
  rows = 0
  columns = 0

  frameInterval = 1000
  animationInterval = null

  constructor(rows, columns) {
    this.rows = rows
    this.columns = columns
    for (let i = 0; i < rows; i++) {
      this.gridState.push(0)
    }
  }

  begin() {
    this.grabElements()
    this.populateGrid()
    this.startAnimation()
  }

  startAnimation() {
    this.animationInterval = setInterval(this.animate.bind(this), this.frameInterval)
  }

  stopAnimation() {
    clearInterval(this.animationInterval)
  }

  grabElements() {
    this.gridElement = document.querySelector('tbody')
    this.buttonWrapper = document.querySelector('#button-wrapper')
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
      button.addEventListener('click', () => brickMover.addBrick(rowIterator))
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
}

const brickMover = new BrickMover(8, 10)

document.addEventListener('readystatechange', () => {
  if (document.readyState === 'complete') {
    brickMover.begin()
    window.game = brickMover // ! leaving in for debugging and demo purposes
  }
})
