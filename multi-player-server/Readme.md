# Multiplayer server

The slightly-cleaner and multi-player-friendly version of the brick game demo.

## Up and running

The multi-player version of the brick game is separated into two parts: the `source-client` and the `source-server`.

Each sub-codebase has it's own package.json with build scripts. The package.json at the root level of the multiplayer-server also has a package.json that calls the builds for each sub-codebase.

The end result is a `dist` folder that contains both the server and client code.

```
cd multi-player-server
npm run install:all
npm run build

# or to build each individually (order doesn't matter):
cd source-server
npm run build
cd ../source-client
npm run build

# To launch the codeabse:
npm run start
open http://localhost:3000/gameboard
open http://localhost:3000/brick-controller
open http://localhost:3000/player-controller
```

## Future considerations

There a pretty strong chance that I won't spend much time updating this codebase after the talk, or at least if I do I'll likely not be keeping it as a muliplayer game. That said, if future me does return there are a couple of thoughts worth considering:

### Collision rendering on the server

Right now the gameboard clients are supposed to be dumb renderers, i.e. the only thing they should do is receive game frames, parse them so that they can be rendered, and then render then onto the screen or across the led strip.

This is done for everything but the collisions. The detection of collisions happens on the server, but the logic for determining how that should be rendered out is up to the gameboard.

I did it this way because the web gameboard has a variety of ways to show the collision that include the grid or areas around it (e.g. we could display a banner above the grid saying "hit", or play a sound, or shake the grid, etc), but on the physical LED matrix we're much more limited. The "space around the grid" is just literal reality. So, I left the method of rendering up to the board client itself.

This is fine, we do display collisions slightly differently on each board, but really I think the way the physical led matrix displays the collision (i.e. turning any unoccupied cell orange) probably works fine for both the physical and web gameboards. This means we could pull the logic of "how a collision affects the colors of the rest of the gameboard" up to the server, making the gameboard clients even dumber.

When I thought about this I almost sat down and started the logic migration, but there's another snag to consider: our game frames represent the state of _things on the gameboard_, but it doesn't represent the gameboard itself. That is, the frames don't contain color information for any non-occupied cell.

So, if we were going to set the color of the unoccupied cells on the server during a collision, we'd need to also set the color of the unoccupied cells all of the time. Really, this isn't a bad idea, and it would allow for the gameboards to truly match (right now everything matches except for unoccupied cells), but it's more work than what I feel like doing now.
