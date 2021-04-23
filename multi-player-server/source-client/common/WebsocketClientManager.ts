import ClientMessageBuilder, { ClientRegisteredPayload } from "../common/ClientMessageBuilder";
import EventEmitter from "events"
import { clientTypeEnum, messageTypeEnum, PlayPhaseEnum } from "project-common/Enumerables";

export interface GameFrameData {

  playPhase: PlayPhaseEnum,
  player: number,
  bricks: Uint32Array
}

export enum ClientEvents {
  GAME_FRAME,
  CLIENT_REGISTRATION_COMPLETE,
  SOCKET_ERROR,
  WAITING_FOR_TURN,
  BRICK_ROW_ASSIGNED,
  GAME_TICK
}
// TODO: consider refactor
// * I can't tell if this feels sloppy or organized
// ! feels sloppy and unneeded, ripout
export type ReturnMessagePayloadType = Uint8Array | ClientRegisteredPayload | undefined

export interface ReconnectConfig {
  reconnectAfterLosingConnecton: boolean
  attemptIntervalInMilliseconds: number
  totalAttempts: number
}

class WebsocketClientManager extends EventEmitter {
  socket?: WebSocket
  websocketUrl: string

  reconnectConfig?: ReconnectConfig
  reconnectionAttempts: number = 0
  registrationInformation: {
    row: number | null
    id: Uint8Array | null
  }
  messageBuilder: ClientMessageBuilder
  clientType: clientTypeEnum;
  reconnectCallback: () => void = () => { };
  messageHandlers: Array<(messageArray: ReturnMessagePayloadType) => any> = []; // TODO: ripout?

  constructor(websocketUrl: string, clientType: clientTypeEnum, messageBuilder: ClientMessageBuilder, reconnectConfig?: ReconnectConfig) {
    super()
    this.clientType = clientType
    this.websocketUrl = websocketUrl
    this.reconnectConfig = reconnectConfig
    this.messageBuilder = messageBuilder

    this.registrationInformation = {
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
      this.socket.addEventListener("open", callback)
    }
  }

  public addErrorListener(callback: (error: Event) => void) {
    this.socket?.addEventListener("error", (errorEvent: Event) => callback(errorEvent))
  }
  public addCloseListener(callback: (closeEvent: CloseEvent) => void) {
    this.socket?.addEventListener("close", (closeEvent: CloseEvent) => callback(closeEvent))
  }

  public sendMessage(type: messageTypeEnum, payload: Uint8Array) {
    this.socket?.send(this.messageBuilder.build(type, payload))
  }
  public sendAdminMessage(type: messageTypeEnum, adminId: Uint8Array) {
    const message = this.messageBuilder.build(type, undefined, adminId)
    this.socket?.send(message)
  }

  private addListeners() {
    this.socket?.addEventListener("close", this.closeListener.bind(this))
    this.socket?.addEventListener("open", this.openListener.bind(this))
    this.socket?.addEventListener("error", this.errorListener.bind(this))
    this.socket?.addEventListener("message", this.generalMessageListener.bind(this))
  }

  protected registerClient() {
    let buffer: Uint8Array

    // ^ on yeah laaaaazy coding!!
    if (this.registrationInformation.id) {
      buffer = Uint8Array.from([
        this.clientType,
        messageTypeEnum.REGISTER_CLIENT,
        ...this.registrationInformation.id
      ])
    } else {
      buffer = Uint8Array.from([
        this.clientType,
        messageTypeEnum.REGISTER_CLIENT
      ])
    }

    this.socket?.send(buffer)
  }


  public storeRegistration(data: ClientRegisteredPayload) {
    this.registrationInformation.id = data.id
    this.messageBuilder.setId(data.id)
  }

  // TODO: ripout?
  public addMessageHandler(callback: (message: ReturnMessagePayloadType) => any) {
    this.messageHandlers.push(callback)
  }

  private async generalMessageListener(message: MessageEvent) {

    const messageByteArray = new Uint8Array(await message.data.arrayBuffer())

    // TODO: structure consideration
    // * We could handle all of the communication with the subclass via calling passed in handlers or
    // * we could handle it through event emission. I can't decide which one I like more, but I'm kind of 
    // * leaning to event emission so that we don't have to mess around with callback management. 
    switch (messageByteArray[0]) {
      case messageTypeEnum.CLIENT_REGISTERED:
        this.storeRegistration(new ClientRegisteredPayload(messageByteArray))
        // TODO: replace string event names with enums
        this.emit(ClientEvents.CLIENT_REGISTRATION_COMPLETE.toString(), messageByteArray)
        break
      case messageTypeEnum.GAME_FRAME:
        const data = new Uint32Array(await message.data.arrayBuffer())
        const frame: GameFrameData = {
          playPhase: data.slice(1, 2)[0],
          player: data.slice(2, 3)[0],
          bricks: data.slice(3, data.length),
        }
        this.emit(ClientEvents.GAME_FRAME.toString(), frame)
        break
      case messageTypeEnum.CONTROLLER_CONTROL_REMOVED:
        this.emit(ClientEvents.WAITING_FOR_TURN.toString())
        break
      case messageTypeEnum.BRICK_ROW_ASSIGNMENT:
        this.emit(ClientEvents.BRICK_ROW_ASSIGNED.toString(), messageByteArray[1])
        break
      case messageTypeEnum.GAME_TICK:
        this.emit(ClientEvents.GAME_TICK.toString())
        break
      case messageTypeEnum.BACK_TO_LOBBY:
        window.location.replace(`http://${window.location.host}`)
      case messageTypeEnum.ERROR:
        console.error("An error was thrown on the game server:")
        console.log(messageByteArray)
        this.emit(ClientEvents.SOCKET_ERROR.toString(), messageByteArray)
      default:
        console.log("unknown message:")
        console.log(messageByteArray.forEach(byte => console.log(byte.toString(16))))
    }
  }


  private openListener(openEvent: any) {
    console.log("===> Websocket connection open. <===")
    console.log(`Open target: ${openEvent.target}`)
    console.log("====================================")

    this.reconnectionAttempts = 0

    this.registerClient()
  }

  private closeListener(closeEvent: any) {
    console.log("===> Websocket connection closed. <===")
    console.log(`Close was clean: ${closeEvent.wasClean}`)
    console.log(`Close event code: ${closeEvent.code}`)
    console.log(`Close event reason: ${closeEvent.reason}`)
    console.log("======================================")

    if (
      this.reconnectConfig?.reconnectAfterLosingConnecton &&
      this.reconnectionAttempts < this.reconnectConfig.totalAttempts
    ) {
      this.reconnectionAttempts++
      setTimeout(() => {
        console.log(`Attempting reconnect try:${this.reconnectionAttempts} `)
        this.reconnect()
      }, this.reconnectConfig.attemptIntervalInMilliseconds)
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