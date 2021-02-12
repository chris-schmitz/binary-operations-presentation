import { clientTypeEnum, messageTypeEnum } from "./Enumerables";

class ClientMessageBuilder {
  clientType: clientTypeEnum
  id: Uint8Array | null

  constructor(clientType: clientTypeEnum) {
    this.clientType = clientType
    this.id = null
  }

  public setId(id: Uint8Array) {
    this.id = id
  }

  public build(messageType: messageTypeEnum, payload: Uint8Array) {
    if (!this.id) {
      throw new Error("The ClientMessage helper class doesn't have an ID assigned")
    }

    return Uint8Array.from([
      this.clientType,
      messageType,
      ...this.id,
      ...payload
    ])
  }
}

export default ClientMessageBuilder
