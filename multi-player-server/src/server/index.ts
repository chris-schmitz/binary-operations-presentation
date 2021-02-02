import express from "express"
import http from "http"
import GameManager from "./GameManager"
import WebsocketManager from "./WebsocketManager"
import { join } from "path"
import { v4 as uuid } from "uuid";

const port = 3000

// TODO: ripout consideration
// * I'm adding express here, but tbh I don't know that I'll need it.
// * I'm leaving it in in case I want rest enpoints, but if this ends up being all 
// * websockets and a static page and maybe a simple ajax request or two, considerer
// * ripping out express
const app = express()
const webroot = join(__dirname, "..", "..", "public")
const server = http.createServer(app)

// app.use(express.static(webroot))
console.log('test')


// const socketManager = new WebsocketManager(server)
// const manager = new GameManager(socketManager)

app.get('/', (request: express.Request, response: express.Response) => {
  response.send('It worked??!!!')
})

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})