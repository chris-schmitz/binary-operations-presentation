import { getRandomWord } from "../helpers/random-words"
import { writeFileSync, mkdir } from "fs";
import { join } from "path";
import { randomByte } from "../helpers/number-tools";


export enum BytePasswordType {
  PLAYER,
  BRICK,
  ADMIN,
  GAMEBOARD
}

export class PasswordManager {
  private static _instance: PasswordManager
  passwordDirectoryPath: string = join(__dirname, "cachedPasswords");
  byteIdPasswordLength: number = 1;

  private constructor() {
    this.makeCachedPasswordDirectory()
  }
  private makeCachedPasswordDirectory() {
    mkdir(this.passwordDirectoryPath, { recursive: true }, () => {
      console.log("cache directory created")
    })
  }

  public static getInstance(): PasswordManager {
    if (!PasswordManager._instance) {
      PasswordManager._instance = new PasswordManager()
    }
    return PasswordManager._instance
  }

  public setPasswordDirectoryPath(basePath: string) {
    this.passwordDirectoryPath = basePath
  }

  public setByteIdPasswordLength(bytePasswordLength: number) {
    this.byteIdPasswordLength = bytePasswordLength
  }

  public generateWordPassword() {
    const password = getRandomWord()
    this.writeToFile("controllerPagePassword.txt", password)
    return password
  }

  public generateByteArrayPassword(type: BytePasswordType) {
    const id = new Uint8Array(randomByte(this.byteIdPasswordLength))
    switch (type) {
      case BytePasswordType.ADMIN:
        this.writeToFile("adminId.txt", id)
        const command = Uint8Array.from([0x05, 0x0E, ...id])
        this.writeToFile("restartCommand.txt", command)
        break
      case BytePasswordType.PLAYER:
        this.writeToFile("playerId.txt", id)
        break
    }
    return new Uint8Array(id)
  }
  private writeToFile(fileName: string, password: string | Uint8Array) {
    writeFileSync(join(this.passwordDirectoryPath, fileName), password)
  }
}

const passwordManager = PasswordManager.getInstance()

export default passwordManager