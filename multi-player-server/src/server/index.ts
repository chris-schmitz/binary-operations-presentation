import express from "express"
import http from "http"
import GameManager from "./GameManager"
import WebsocketManager from "./WebsocketManager"
import { join } from "path"

// TODO: ripout consideration
// * I'm adding express here, but tbh I don't know that I'll need it.
// * I'm leaving it in in case I want rest enpoints, but if this ends up being all 
// * websockets and a static page and maybe a simple ajax request or two, considerer
// * ripping out express
const app = express()
const webroot = join(__dirname, "..", "..", "public")
console.log(webroot)
app.use(express.static(webroot))
const server = http.createServer(app)

const port = 3000

const socketManager = new WebsocketManager(server)
const manager = new GameManager(socketManager)

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})