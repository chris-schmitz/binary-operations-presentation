function randomByte(numberOfBytes: number, startingNumber = 0): ArrayBuffer {
  let buffer = new ArrayBuffer(numberOfBytes)
  let view = new Uint8Array(buffer)

  for (let i = 0; i < numberOfBytes; i++) {
    view[i] = Math.floor(Math.random() * 255)
  }
  return buffer

  // if (numberOfBytes !== 0) {
  //   startingNumber <<= 8
  //   startingNumber += Math.floor(Math.random() * 255)
  //   return randomByte(numberOfBytes - 1, startingNumber)
  // }
  // return startingNumber
}

export { randomByte }