import { ControllerClient } from "./ControllerClient";

export interface BrickControllerClient extends ControllerClient {
  row: number | null;
  turnTimeout?: NodeJS.Timeout;
}
