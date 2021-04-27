# Multi player brick game

A websocket driven multi-player game where one player tries to avoid bricks sent down rows buy one to eight other players.

![demo](./_readme_attachments/brick_demo.gif)

## The gist

I want to give a couple of meetup talks centered around number systems in computers (binary, hex, how they're used), websockets, arduino, 3d modeling/printing. I like being able to use practical demos as examples for talks so I thought I'd create a simple game that threads the needles for all of those topics.

The game is a super simple avoidance game. It uses websockets to facilitate the communication between the game controllers, the server, and the game boards. The message payloads are all bit arrays, either 8 bit or 32 bits.

## Up and running

Here's how to get up and running with this codebase. Before we go over the steps, there are a couple of things that are assumed:

- You have nodejs installed. I'm running version 15.9.0, though I imagine this would also run on older versions. You can install node (which comes bundled with npm) from:
  - [The official nodejs site](https://nodejs.org/en/download/)
  - Using [Node Version Manager](https://github.com/nvm-sh/nvm#installing-and-updating) which allows for easy switching between versions
- You have the version control tool [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed

Also, I don't have a windows computer so I'm not sure how many of these notes would need to be adjusted for a windows user :grimace:

### Installation

Pop open a terminal, `cd` to whatever directory you want to install the code base in, and type in:

```sh
git clone https://github.com/chris-schmitz/binary-operations-presentation
cd binary-operations-presentation
npm run install:all
npm run build
```

At this point if you run an `ls -l` you should notice a `dist` directory

![successful build of dist directory](./_readme_attachments/build-dist-directory.png)

### Launching the project

Once the `dist` directory is built you can launch the project. Note that unless you're adjusting the source code you don't need to rebuild the `dist` directory between launches.

There's a lot to get done to get this whole project up and running. I got irritated by this so I boiled it down to a couple of npm scripts:

```sh
npm start # This will launch the server
open http://localhost:3000

# The player controller requires an ID that has to come from the server, to get it run the following command:
npm run game:print-player-id

# Also, once the game has finished, you can restart it by running the command:
npm run game:restart

# Note that after you restart the game you'll need to print a new player id
```

## A note about ... the cruft

This codebase is wasn't rushed, it was much the opposite. I wrote this codebase over the course of months in ~45 minute daily sprints (the time between helping get the family squared away for the day and starting work). Because of this there's a low of code sprawl, things that should be refactored, and a variety of approaches and styles all lumped together based on where my mind was at on a particular day.

So, keep that in mind as you dig through the code. It's not an apology, just a "when you look at a particular section of code and interrobang, that may be why".

## A note about "security" in this project

TODO: fill this in

## The payloads

The main reason I built this codebase is to use it as a practical talking point for number formats (e.g. binary, hex, etc) and common practices around using specific formats. Because of this, and to facilitate low-latency/high-frequency communication all of the data payloads coming from and being sent to the server are bit arrays.

### Controller clients -> Server payloads

The controller clients send simple byte array data payloads to the server for their commands. These payloads consist of a couple of meta data bytes and an optional payload:

```
[
  CLIENT TYPE, // * the clientTypeEnum value for the particular client type
  MESSAGE TYPE, // * the messageTypeEnum denoting the type of message being sent
  ID BYTE 1, // * A randomly generated 4 byte ID
  ID BYTE 2,
  ID BYTE 3,
  ID BYTE 4,
  OPTIONAL DATA, // * any accompanying data (e.g. the brick color to use for a send brick command)
  ...
]
```

You can see how this message is built in []()

And how the server parses the messages in [WebsocketServer's `parseMessage` method](./source-server/WebsocketServer.ts)

Messages from the Server back down to controller clients is in the same byte array shape, but with just the data that the client needs (i.e. no payload and now client type).

Something worth considering in future projects is to add in a payload length byte so we can validate the data we're getting and potentially add more data after the payload if that's called for.

### Server -> gameboards

## Future considerations

There a pretty strong chance that I won't spend much time updating this codebase after the talk, or at least if I do I'll likely not be keeping it as a muliplayer game. That said, if future me does return there are a couple of thoughts worth considering:

### Collision rendering on the server

Right now the gameboard clients are supposed to be dumb renderers, i.e. the only thing they should do is receive game frames, parse them so that they can be rendered, and then render then onto the screen or across the led strip.

This is done for everything but the collisions. The detection of collisions happens on the server, but the logic for determining how that should be rendered out is up to the gameboard.

I did it this way because the web gameboard has a variety of ways to show the collision that include the grid or areas around it (e.g. we could display a banner above the grid saying "hit", or play a sound, or shake the grid, etc), but on the physical LED matrix we're much more limited. The "space around the grid" is just literal reality. So, I left the method of rendering up to the board client itself.

This is fine, we do display collisions slightly differently on each board, but really I think the way the physical led matrix displays the collision (i.e. turning any unoccupied cell orange) probably works fine for both the physical and web gameboards. This means we could pull the logic of "how a collision affects the colors of the rest of the gameboard" up to the server, making the gameboard clients even dumber.

When I thought about this I almost sat down and started the logic migration, but there's another snag to consider: our game frames represent the state of _things on the gameboard_, but it doesn't represent the gameboard itself. That is, the frames don't contain color information for any non-occupied cell.

So, if we were going to set the color of the unoccupied cells on the server during a collision, we'd need to also set the color of the unoccupied cells all of the time. Really, this isn't a bad idea, and it would allow for the gameboards to truly match (right now everything matches except for unoccupied cells), but it's more work than what I feel like doing now.

### Dynamic grid size

My initial plan was to make the codebase completely adjustable as far as gameboard grid size so that it could accommodate any number of players and columns. You can see that in the original prototype and a bit in the final classes.

But, I decided part of the way through the build that I would hard code the gameboard to an 8x8 grid. This is primarily because I decided to build an RGB LED matrix to go with the game and it would be 8x8. It made the code a bit easier to write by hard coding it to 8x8. That said it would be really cool to make the codebase fully dynamic based on a project-common configuration that sets the grid size or by an adjustable parameter in the API.
