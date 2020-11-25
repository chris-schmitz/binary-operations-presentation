# Binary Operations Presentation

I took a dev test just recently and one of the problems to solve asked me to create a program to draw a simple animation based on some initial character input. The animation needed to move characters left and right across a number of frames. It reminded me of some microcontroller code I wrote to animate lights on an LED strip, so I solved the problem using bit shifting.

The question, and the fact that I was told that no one had solved it that way before, inspired me to do a presentation for the STL Full Stack on binary operations. This project is definitely not a re-creation of the test problem, it's a much more elaborate game that I'm using to show off the concepts.

![demo](./readme_attachments/player-movement.gif)
_a work-in-progress look at the demo_

## Up and running

If you want to pull down this project and explore it yourself you'll need node (I'm using v14.5.0) installed on your computer.

If you have node installed, pop open a terminal and fire the following:

```bash
git clone https://github.com/chris-schmitz/binary-operations-presentation.git

# Running the demo server
cd binary-operations-presentation/server
npm install
npm run dev
# At this point you should be able to open a web browser to http://localhost:3001
```

# Topics to cover

## Binary vs Hex vs Decimal

### Places you see binary in use already

- Permissions
- ...

## Number <-> State

## The basic bitwise operations

## Masking

## Branchless programming
