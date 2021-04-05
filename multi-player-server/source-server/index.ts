import express from "express"
import http from "http"
import GameManager from "./GameManager"
import WebsocketServer from "./WebsocketServer"
import { join } from "path"
import { BrickControllerManager } from "./BrickControllerManager"
import { PlayerControllerManager } from "./PlayerControllerManager";
import { getRandomWord } from "./helpers/random-words";

const port = 3000

// TODO: ripout consideration
// * I'm adding express here, but tbh I don't know that I'll need it.
// * I'm leaving it in in case I want rest endpoints, but if this ends up being all 
// * websockets and a static page and maybe a simple ajax request or two, considerer
// * ripping out express
const app = express()
const webroot = join(__dirname, "..", "..", "public")
// const webroot = join(__dirname, "..", "public")
const server = http.createServer(app)

app.use(express.static(webroot))

const manager = new GameManager(true)
const brickControllerManager = new BrickControllerManager(manager, 25)
const playerControllerManager = new PlayerControllerManager()
const socketManager = new WebsocketServer(server, manager, brickControllerManager, playerControllerManager, true)

const queryParameterPassword = getRandomWord()

// * adds lightly protected pages. This should be an easily accessed game, but once you know the url anyone could hop in at any time.
// * So, anytime we reload the server process we generate a new random word (prob wouldn't be a bad idea to switch this up via an admin
// * websocket command as well), so that to get into the current game session you need to know the correct easily typed password to get in 
app.get("/brick-controller", (request, response) => {
  if (request.query["password"] === queryParameterPassword) {
    response.sendFile(join(__dirname, "indexes", "brick-controller", "index.html"))
  } else {
    response.send("access denied")
  }
})
app.get("/player-controller", (request, response) => {
  if (request.query["password"] === queryParameterPassword) {
    response.sendFile(join(__dirname, "indexes", "player-controller", "index.html"))
  } else {
    response.send("access denied")
  }
})


server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})