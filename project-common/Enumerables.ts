
export enum messageTypeEnum {
  REGISTER_CLIENT = 0x04,
  CLIENT_REGISTERED,
  UPDATE_CREDENTIALS,
  ADD_BRICK,
  GAME_FRAME,
  ERROR,
  BRICK_ROW_ASSIGNMENT,
  CONTROLLER_CONTROL_REMOVED,
  GAME_TICK,
  PLAYER_MOVE,
  RESTART_GAME,
  REMOVE_PLAYER_CONTROLLER,
  BACK_TO_LOBBY,
  ART_FRAME
}


export enum clientTypeEnum {
  GAMEBOARD = 0x01,
  BRICK_CONTROLLER,
  PLAYER_CONTROLLER,
  TOUCH_CONTROLLER,
  ADMIN,
  MULTI_BRICK_CONTROLLER
}

export enum directionEnum {
  UP = 0x01,
  DOWN,
  LEFT,
  RIGHT
}


export enum errorTypes {
  PLAYER_ID_INCORRECT,
  PLAYER_ALREADY_REGISTERED,
  PLAYER_ID_NOT_GENERATED
}

export enum PlayPhaseEnum {
  // * we're going to group this in the first byte with the current collision state (boolean)
  IDLE = 0b010,
  PLAYING,
  GAME_OVER
}