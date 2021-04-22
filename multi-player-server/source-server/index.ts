import express from "express"
import http from "http"
import GameManager from "./GameManager"
import WebsocketServer from "./WebsocketServer"
import { join } from "path"
import { BrickControllerManager } from "./BrickControllerManager"
import { PlayerControllerManager } from "./PlayerControllerManager";
import passwordManager from "./PasswordManager";
import { idByteLength } from "../project-common/config.json";
import { readFile } from "fs/promises";

const port = 3000

const app = express()
const webroot = join(__dirname, "..", "..", "public")
const server = http.createServer(app)

app.use(express.static(webroot))

passwordManager.setByteIdPasswordLength(idByteLength)

const manager = new GameManager(true)
const brickControllerManager = new BrickControllerManager(manager, 25)
const playerControllerManager = new PlayerControllerManager()
new WebsocketServer(server, manager, brickControllerManager, playerControllerManager, true)

const queryParameterPassword = passwordManager.generateWordPassword()

// * adds lightly protected pages. This should be an easily accessed game, but once you know the url anyone could hop in at any time.
// * So, anytime we reload the server process we generate a new random word (prob wouldn't be a bad idea to switch this up via an admin
// * websocket command as well), so that to get into the current game session you need to know the correct easily typed password to get in 
app.get("/brick-controller", (request, response) => {
  if (request.query["pw"] === queryParameterPassword) {
    response.sendFile(join(__dirname, "indexes", "brick-controller", "index.html"))
  } else {
    response.send("access denied")
  }
})
app.get("/multi-brick-controller", (request, response) => {
  if (request.query["pw"] === queryParameterPassword) {
    response.sendFile(join(__dirname, "indexes", "multi-brick-controller", "index.html"))
  } else {
    response.send("access denied")
  }
})
app.get("/player-controller", (request, response) => {
  if (request.query["pw"] === queryParameterPassword) {
    response.sendFile(join(__dirname, "indexes", "player-controller", "index.html"))
  } else {
    response.send("access denied")
  }
})

app.get("/", async (request, response) => {
  const domainName = "localhost:3000" // TODO: pull from an env file

  const replacements: { [key: string]: string } = {
    "!!playerControllerUrl!!": `/player-controller?pw=${queryParameterPassword}`,
    "!!brickControllerUrl!!": `/brick-controller?pw=${queryParameterPassword}`,
    "!!gameboardUrl!!": `/gameboard`
  }

  const html = await readFile(join(__dirname, "indexes", "lobby", "index.html"), { encoding: "utf-8" })

  const search = new RegExp(`${Object.keys(replacements).join("|")}`, "g")

  const dataInserted = html.replace(search, match => {
    return replacements[match]
  })
  response.send(dataInserted)
})


server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})