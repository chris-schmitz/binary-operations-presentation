// ^ file names are hard :|

function randomByte(numberOfBytes: number, startingNumber = 0): ArrayBuffer {
  let buffer = new ArrayBuffer(numberOfBytes)
  let view = new Uint8Array(buffer)

  for (let i = 0; i < numberOfBytes; i++) {
    view[i] = Math.floor(Math.random() * 255)
  }
  return buffer
}

function uintArrayToHex(array: Uint8Array) {
  return array.reduce((carry, current) => {
    return carry + current.toString(16)
  }, "")
}

function getBinaryExpontent(bit: number) {
  return Math.log(bit) / Math.log(2)
}

export { randomByte, uintArrayToHex, getBinaryExpontent }