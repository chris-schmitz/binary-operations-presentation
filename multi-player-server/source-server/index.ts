import express from "express"
import http from "http"
import GameManager from "./GameManager"
import WebsocketServer from "./WebsocketServer"
import { join } from "path"
import { BrickControllerManager } from "./BrickControllerManager"
import { PlayerControllerManager } from "./PlayerControllerManager";
import passwordManager from "./PasswordManager";
import { idByteLength } from "../project-common/config.json";

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
app.get("/player-controller", (request, response) => {
  if (request.query["pw"] === queryParameterPassword) {
    response.sendFile(join(__dirname, "indexes", "player-controller", "index.html"))
  } else {
    response.send("access denied")
  }
})

app.get("/", (request, response) => {
  response.redirect("/gameboard")
})


server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})