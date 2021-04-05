import express from "express"
import http from "http"
import GameManager from "./GameManager"
import WebsocketServer from "./WebsocketServer"
import { join } from "path"
import { v4 as uuid } from "uuid";
import { BrickControllerManager } from "./BrickControllerManager"
import { PlayerControllerManager } from "./PlayerControllerManager";

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

app.get("/brick-controller", (request, response) => {
  console.log(request.query)
  if (request.query["test"] === 'worked') {
    const indexPath = join(__dirname, "indexes", "brick-controller", "index.html")
    response.sendFile(indexPath)
  } else {
    response.send("access denied")
  }
})
app.get("/player-controller", (request, response) => {
  console.log(request.query)
  if (request.query["test"] === 'worked') {
    const indexPath = join(__dirname, "indexes", "player-controller", "index.html")
    response.sendFile(indexPath)
  } else {
    response.send("access denied")
  }
})


server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})