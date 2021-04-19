import { BrickColor } from "../common/BrickColor";
import EventEmitter from "events";

export enum ControlCellEnum {
  FIRE_BRICK
}
// * I"m grabbing onto html elements here for simplicity's sake, but
// * in future incarnations i'd likely pull the element creation logic 
// * into the javascript and make `new ControlCell(...)` just standup
// * everything
export default class ControlCell extends EventEmitter {
  cellElement: Element;
  cellIndex: number;
  button: HTMLButtonElement | null = null;
  buttonLabel: HTMLElement | null = null;
  colorPicker: HTMLInputElement | null = null;
  brickColor!: BrickColor;
  buttonIsLocked: boolean = true;
  buttonLockTickCount: number = 0;
  buttonLockTickCountTotal: number;
  constructor(cellElement: Element, cellIndex: number, buttonLockTickCountTotal: number) {
    super();
    this.cellElement = cellElement;
    this.cellIndex = cellIndex;
    this.buttonLockTickCountTotal = buttonLockTickCountTotal;
    this.grabElements();
    this.addButtonListener();
    debugger
    const randomColor = BrickColor.withRandomColor()
    this.setBrickColor(randomColor);
    this.colorPicker!.value = `#${randomColor.asHex()}`

    this.setButtonActive();
  }
  private setButtonActive(active: Boolean = true) {
    if (active) {
      this.button?.classList.remove("disabled");
      this.button!.disabled = false;
    } else {

      this.button?.classList.add("disabled");
      this.button!.disabled = true;
    }
  }

  public lockButton() {
    this.buttonIsLocked = true;
    this.setButtonActive(false);
    this.updateLabel("Locked!");
  }
  public tick() {
    if (!this.buttonIsLocked)
      return;

    this.buttonLockTickCount++;
    if (this.buttonLockTickCount > this.buttonLockTickCountTotal) {
      this.buttonLockTickCount = 0;
      this.unlockButton();
    }
  }

  public unlockButton() {
    this.buttonIsLocked = false;
    this.setButtonActive(true);
    this.updateLabel("Fire!");
  }

  private grabElements() {
    this.button = this.cellElement.querySelector("button");
    this.buttonLabel = this.cellElement.querySelector(".button-label");
    this.colorPicker = this.cellElement.querySelector(".color-picker");

  }

  private addButtonListener() {
    this.cellElement.querySelector("button")?.addEventListener("click", this.handleButtonClick.bind(this));
    this.colorPicker?.addEventListener("change", this.updateBrickColor.bind(this));
  }
  private updateBrickColor(changeEvent: Event) {
    const target = changeEvent.target as HTMLInputElement;
    let hexColor = parseInt(target.value.slice(1, target.value.length), 16); // ? chop off that `#` from the string
    const color = BrickColor.fromHex(hexColor);
    this.setBrickColor(color);
    this.setButtonColor(color);
  }
  private setButtonColor(color: BrickColor) {
    if (!this.button)
      return;
    this.button!.style.backgroundColor = color.asCSS();
  }

  private setBrickColor(color: BrickColor) {
    this.brickColor = color;
    this.setButtonColor(color);
  }
  private handleButtonClick(event: MouseEvent) {
    console.log(`cell ${this.cellIndex} clicked`);
    this.emit(ControlCellEnum.FIRE_BRICK.toString(), { color: this.brickColor, index: this.cellIndex });
    this.lockButton();
  }

  private updateLabel(text: string) {
    this.buttonLabel!.innerHTML = text;
  }

  private buttonLockListener() {
    if (!this.buttonIsLocked)
      return;

    this.buttonLockTickCount++;
    if (this.buttonLockTickCount > this.buttonLockTickCountTotal) {
      this.buttonLockTickCount = 0;
      this.unlockButton();
    }
  }

}
