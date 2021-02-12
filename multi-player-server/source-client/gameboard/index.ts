import { StateRenderer } from "./gameboard";

const stateRenderer = new StateRenderer()

document.addEventListener('readystatechange', () => stateRenderer.initalize())

console.log("game board worked")