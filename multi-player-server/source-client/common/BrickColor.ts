import { BrickColor as RGBBrickColor } from "./Interfaces";

export class BrickColor {
  private color: RGBBrickColor;

  constructor() {
    this.color = { red: 0, green: 0, blue: 0 };
  }

  static fromHex(color: number) {
    const brickColor = new BrickColor();
    brickColor.setColorHEX(color);
    return brickColor;
  }
  static fromRGB(color: RGBBrickColor) {
    const brickColor = new BrickColor();
    brickColor.setColorRGB(color);
    return brickColor;
  }

  public asRGB() {
    return this.color;
  }

  public asHex() {
    let hex = 0;
    hex |= this.color.red;
    hex <<= 16;
    hex |= this.color.green;
    hex <<= 16;
    hex |= this.color.blue;
    return hex;
  }

  public asPrefixedHex() {
    return `#${this.asHex()}`;
  }

  public asCSS() {
    return `rgb(${this.color.red}, ${this.color.green}, ${this.color.blue})`;
  }

  // TODO: refactor if you feel like it
  // * go back and read about typeguarding and checking with interfaces and then come back and make
  // * a single `setColor` method with a number or RGBBrickColor type, switch on the argument, and 
  // * call the individual setColor___ methods as needed (make those methods private)
  public setColorRGB(color: RGBBrickColor) {
    this.color.red = color.red;
    this.color.green = color.green;
    this.color.blue = color.blue;
  }
  public setColorHEX(color: number) {
    this.color.blue = color & 0xFF;
    color >>= 8;
    this.color.green = color & 0xFF;
    color >>= 8;
    this.color.red = color & 0xFF;
  }
}
