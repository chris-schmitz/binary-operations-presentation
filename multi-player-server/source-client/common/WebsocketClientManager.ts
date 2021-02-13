import ClientMessageBuilder, { ClientRegisteredPayload } from "../common/ClientMessageBuilder";
import EventEmitter from "events"
import { clientTypeEnum, messageTypeEnum } from "project-common/Enumerables";
import { client } from "websocket";

// TODO: consider refactor
// * I can't tell if this feels sloppy or organized
export type ReturnMessagePayloadType = Uint8Array | ClientRegisteredPayload | undefined

class WebsocketClientManager extends EventEmitter {
  socket?: WebSocket
  websocketUrl: string

  attemptReconnect: boolean
  registerationInformation: {
    row: number | null
    id: Uint8Array | null
  }
  messageBuilder: ClientMessageBuilder
  clientType: clientTypeEnum;
  reconnectCallback: () => void = () => { };
  messageHandlers: Array<(messageArray: ReturnMessagePayloadType) => any> = [];

  constructor(websocketUrl: string, clientType: clientTypeEnum, messageBuilder: ClientMessageBuilder, attemptReconnect = true) {
    super()
    this.clientType = clientType
    this.websocketUrl = websocketUrl
    this.attemptReconnect = attemptReconnect
    this.messageBuilder = messageBuilder
    // this.reconnectCallback = null

    this.registerationInformation = {
      id: null,
      row: null
    }
  }

  public reconnect(callback?: () => void | null) {
    // TODO: consider: is this the best way of handling holding on to the callback?
    if (callback) {
      this.reconnectCallback = callback
    } else if (this.reconnectCallback !== null) { // ? i.e. if we didn't get passed a callback now, but we've had one previously
      callback = this.reconnectCallback
    }

    this.socket = new WebSocket(this.websocketUrl)

    this.addListeners()

    if (callback) {
      callback()
    }
  }

  public sendMessage(type: messageTypeEnum, payload: Uint8Array) {
    this.socket?.send(this.messageBuilder.build(type, payload))
  }

  private addListeners() {
    this.socket?.addEventListener("close", this.closeListener.bind(this))
    this.socket?.addEventListener("open", this.openListener.bind(this))
    this.socket?.addEventListener("error", this.errorListener.bind(this))
    this.socket?.addEventListener("message", this.generalMessageListener.bind(this))
  }

  protected registerClient() {
    const buffer = new Uint8Array(new ArrayBuffer(2))
    buffer[0] = this.clientType
    buffer[1] = messageTypeEnum.REGISTER_CLIENT
    this.socket?.send(buffer)
  }


  public storeRegistration(data: ClientRegisteredPayload) {
    this.registerationInformation.row = data.row
    this.registerationInformation.id = data.id
    this.messageBuilder.setId(data.id)
  }

  public addMessageHandler(callback: (message: ReturnMessagePayloadType) => any) {
    this.messageHandlers.push(callback)
  }

  private async generalMessageListener(message: MessageEvent) {

    const messageArray = ClientMessageBuilder.interpret(new Uint8Array(await message.data.arrayBuffer()))

    if (messageArray instanceof ClientRegisteredPayload) {
      // if (messageArray[0] == messageTypeEnum.REGISTER_CLIENT) {
      this.storeRegistration(messageArray)
    }
    this.messageHandlers.forEach(handler => {
      handler(messageArray)
    })


  }

  // TODO: cut?
  // private messageListeners(message: Event) {
  //   this.messageHandlers.forEach(callback => {
  //     callback()
  //   })
  // }

  private openListener(openEvent: any) {
    // if (this.verboseLogging) {
    console.log("===> Websocket connection open. <===")
    console.log(`Open target: ${openEvent.target}`)
    console.log("====================================")

    this.registerClient()
    // }
  }

  private closeListener(closeEvent: any) {
    // if (this.verboseLogging) {
    console.log("===> Websocket connection closed. <===")
    console.log(`Close was clean: ${closeEvent.wasClean}`)
    console.log(`Close event code: ${closeEvent.code}`)
    console.log(`Close event reason: ${closeEvent.reason}`)
    console.log("======================================")
    // }

    if (this.attemptReconnect) {
      console.log("Attempting reconnect")
      this.reconnect()
    }
  }

  private errorListener(errorEvent: any) {
    console.log("===> There was an error with the websocket connection <===")
    console.log(`Error: ${errorEvent.error}`)
    console.log(`Error type: ${errorEvent.type}`)
    console.log(`Error message: ${errorEvent.message}`)
    console.log("==========================================================")

  }
}

export default WebsocketClientManager