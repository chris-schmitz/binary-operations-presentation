import { clientTypeEnum, messageTypeEnum } from "project-common/Enumerables";


// TODO: CHANGED MY MIND -> RIP THIS OUT
export class ClientRegisteredPayload {
  // row: number
  id: Uint8Array
  constructor(payload: Uint8Array) {
    //  * index 0 is the client type which doesn't matter to us 
    // this.row = payload[1]
    this.id = payload.slice(1, payload.length)
  }
}

interface PayloadForClient {
  messageType: messageTypeEnum
  payload: Uint8Array
}

class ClientMessageBuilder {
  clientType: clientTypeEnum
  id: Uint8Array

  constructor(clientType: clientTypeEnum) {
    this.clientType = clientType
    this.id = Uint8Array.from([])
  }

  public setId(id: Uint8Array) {
    this.id = id
  }

  public static interpret(payload: Uint8Array) {
    switch (payload[0]) {
      case messageTypeEnum.CLIENT_REGISTERED:
        return new ClientRegisteredPayload(payload)
      case messageTypeEnum.GAME_FRAME:
        // * I go back and forth on if we should deserialize the buffer or not
        // * in general, but in this case when we're rendering out the game frame 
        // * we should def just pass back the buffer for speed sake. 
        return payload
    }
  }

  public build(messageType: messageTypeEnum, payload?: Uint8Array, adminId?: Uint8Array) {
    if (!this.id) {
      throw new Error("The ClientMessage helper class doesn't have an ID assigned")
    }
    let id = this.id

    if (adminId) {
      id = adminId
    }

    if (!payload) {
      payload = Uint8Array.from([])
    }

    return Uint8Array.from([
      this.clientType,
      messageType,
      ...id,
      ...payload
    ])
  }
}

export default ClientMessageBuilder
