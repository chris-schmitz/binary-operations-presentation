function randomByte(numberOfBytes: number, startingNumber = 0): ArrayBuffer {
  let buffer = new ArrayBuffer(numberOfBytes)
  let view = new Uint8Array(buffer)

  for (let i = 0; i < numberOfBytes; i++) {
    view[i] = Math.floor(Math.random() * 255)
  }
  return buffer
}

export { randomByte }