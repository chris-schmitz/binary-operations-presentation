/**
 * ^ RGB LED Matrix 
 * 
 * * blah blah
 * 
 * ! A couple of things to note!
 * * - I wrote this code for an 8x8 RGB LED matrix, so there are some hardcoded `8`s in here 
 *   * that _could_ be made dynamic, but I'm going for MVP on this one so there's no need for that flexibility
 */

#include "characters.h"
#include "credentials.h"
#include <Adafruit_NeoPixel.h>
#include <ArduinoWebsockets.h>
#include <WiFi.h>

#define _BV(bit) (1 << (bit))
#define MATRIX_PIN 12
#define DEBUG_MODE false

enum messageTypeEnum
{
  REGISTER_CLIENT = 0x04,
  CLIENT_REGISTERED,
  UPDATE_CREDENTIALS,
  ADD_BRICK,
  GAME_FRAME,
  ERROR
};

enum clientTypeEnum
{
  GAMEBOARD = 0x01,
  BRICK_CONTROLLER,
  PLAYER_CONTROLLER,
  TOUCH_CONTROLLER
};

const char *ssid = WIFI_SSID;
const char *password = PASSWORD;
const char *websocket_server_host = WEBSOCKET_SERVER_HOST;
const uint16_t websocket_server_port = WEBSOCKET_SERVER_PORT;

uint8_t websocketReconnectTotalAttempts = 10;
uint8_t websocketReconnectCount = 0;

byte currentColor = 0;

using namespace websockets;

WebsocketsClient client;

uint32_t previousMatrixState[8] = {0};
uint32_t matrixState[8] = {0};
uint32_t playerState; // * byte 1 == row, byte 2 == column, color separated? we only have 4 bytes. no color for now

Adafruit_NeoPixel matrix = Adafruit_NeoPixel(64, MATRIX_PIN, NEO_RGB + NEO_KHZ800);

uint32_t defaultBackgroundColor = matrix.Color(10, 10, 10);
// uint32_t defaultBackgroundColor = matrix.Color(0, 255, 0);
// uint32_t defaultBackgroundColor = matrix.Color(0, 0, 0);
uint32_t backgroundColor = defaultBackgroundColor;

uint32_t activeColor = matrix.Color(255, 0, 255);

void setup()
{
  Serial.begin(115200);
  Serial.println("Setting up");
  matrix.begin();
  matrix.show();

  clearMatrix(backgroundColor);
  clearMatrixState();

  connectToWifi();
}

// * Wifi and websocket setups =====
void connectToWifi()
{
  WiFi.begin(ssid, password);
  for (int i = 0; i < 10 && WiFi.status() != WL_CONNECTED; i++)
  {
    Serial.print(".");
    delay(1000);
  }
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("Unable to connect to wifi");
    return;
  }

  Serial.println("Connected to Wifi");
  connectToWebsocketServer();
}

void connectToWebsocketServer()
{
  Serial.println("Connecting to websocket server");

  bool connected = client.connect(websocket_server_host, websocket_server_port, "/");
  if (!connected)
  {
    Serial.print(".");
    if (websocketReconnectCount < websocketReconnectTotalAttempts)
    {
      websocketReconnectCount++;
      delay(2000);
      connectToWebsocketServer();
    }
    else
    {
      Serial.println("Unable to connect to websocket server.");
      return;
    }
  }

  Serial.println("Connected to websocket server");

  addWebsocketListener();
  registerAsAGameBoard();
}

void registerAsAGameBoard()
{
  char data[3] = {GAMEBOARD, REGISTER_CLIENT, 0};

  const char *buffer = data;
  size_t size = strlen(buffer);

  Serial.print("Reg size:");
  Serial.println(size);

  client.sendBinary(buffer, size);
}

void onEventsCallback(WebsocketsEvent event, String data)
{
  if (event == WebsocketsEvent::ConnectionOpened)
  {
    Serial.println("---> connection opened.");
    Serial.println(data);
  }
  else if (event == WebsocketsEvent::ConnectionClosed)
  {
    // TODO: add in reconnect logic
    Serial.println("---> Connection closed.");
    Serial.println(data);
  }
}

// TODO: rename this method.
// * my morning brain can't think of the appropriate name, but we should name it something
// * that conveys that we're loading a global variable and not passing something back (also
// * note that this would be resolved naturally if we abstracted all of this logic in a class)
void convertWebsocketMessageToGameFrame(std::string messageData, uint32_t length, uint32_t *gameFrame)
{
  // Serial.println("--------------------------------");
  // Serial.println("message data parse:");

  int frameRowIndex = 0;

  for (int i = 0; i < length; i += 4)
  {
    uint32_t chunk = 0;
    for (int j = 0; j < 4; j++)
    {
      chunk <<= 8;
      chunk |= messageData.at(i + j);
    }
    // TODO: refactor consideration
    // * part of me wants to say "just populate the game state variables here",
    // * but another part of me says "that's giving too much to this function to do"
    gameFrame[frameRowIndex] = chunk;
    frameRowIndex++;
  }

  // TODO: ripout or wrap in a "verbose logging" conditional
  // Serial.println("parsed game frame:");
  // for (int i = 0; i < 11; i++)
  // {
  //   Serial.print(gameFrame[i], HEX);
  //   Serial.print(" == ");
  //   Serial.println(gameFrame[i], BIN);
  // }

  // Serial.println("--------------------------------");
}

void parseGameFrame(uint32_t *gameFrame, uint32_t length)
{

  // * add collision and play phase. it's broken on the server

  playerState = gameFrame[2];

  // ! index 3 is where the brick information starts. prob a better way of handling this instead of magic numbers
  // TODO: move magic numbers out to constants?
  for (int i = 3; i < length; i++)
  {
    // Serial.print("game frame at ");
    // Serial.print(i);
    // Serial.print(": ");
    // Serial.println(gameFrame[i], BIN);
    // previousMatrixState[i - 3] = matrixState[i - 3];
    // ! check this
    matrixState[i - 3] = gameFrame[i];
  }
}

// TODO: refactor considerations:
// * extract state update to a separate function called from the listener
// * Extract websocket handling to a separate class
void addWebsocketListener()
{
  Serial.println("Adding websocket listener");

  client.onEvent(onEventsCallback);

  client.onMessage([&](WebsocketsMessage message) {
    // Serial.print("Got message: ");
    // Serial.println("handing off to parser");

    std::string rawData = message.rawData();

    uint8_t firstByte = rawData.at(0);
    // Serial.print("firstByte: ");
    // Serial.println(firstByte, HEX);

    if (firstByte == GAME_FRAME)
    {
      // TODO: refactor consideration
      // * if you end up refactoring the game logic into it's own class, move this to a private
      // * property.
      // ! also note that we can't move it out to a global var at the moment because we're dynamically
      // ! assigning the memory
      uint32_t gameFrame[message.length() / sizeof(uint32_t)]; // *try moving gameFrame out of scope

      convertWebsocketMessageToGameFrame(rawData, message.length(), gameFrame);
      parseGameFrame(gameFrame, sizeof(gameFrame) / sizeof(gameFrame[0]));
      animate();
      // handleGameFrame();

      // TODO: ripout
      // Serial.print("game frame address: ");
      // Serial.println((int)&gameFrame);

      // Serial.println("storing first 32 bit integer in a variable");
      // uint32_t firstNumber = *gameFrame;

      // Serial.print("game frame first value: ");
      // Serial.println(firstNumber, HEX);

      // Serial.println("printing frame:");
      // for (int i = 0; i < 11; i++)
      // {
      //   Serial.println(gameFrame[i], HEX);
      // }
    }
  });
}

void handleGameFrame()
{
  // ^ what exactly do we need to do here:
  // * update the current and previous matrix states so we can determine if we need an update or not
  // * determine the brick positions
  // * determine the player position
  // * determine if there is a collision (change player color)
  // * merge the player and brick rows
  // * render

  // * note that this can be hard coded, the matrix will always have 8 rows
  // TODO: sweep through all of the code, move the row length out to a constant, replace all magic numbers with constant
  Serial.print("player state: ");
  Serial.println(playerState, BIN);
  Serial.println("brick states");
  for (int i = 0; i < 8; i++)
  {
    Serial.print("row: ");
    Serial.print(i);
    Serial.print(": ");
    Serial.println(matrixState[i], HEX);
  }
}

uint8_t getByte(const char *data, int offset = 0)
{
  uint8_t aByte = 0;
  for (uint8_t i = 0; i < 8; i++)
  {
    aByte <<= 1;
    aByte += data[i + offset];
  }
  return aByte;
}

// TODO: ripout? are we even using this?
void render8x8State(int *state, uint32_t color)
{
  for (int row = 0; row < 8; row++)
  {
    int currentBtye = state[row];

    if (row % 2 != 0)
    {
      currentBtye = reverseByte(currentBtye, 8);
      if (DEBUG_MODE)
      {
        Serial.print("original: ");
        Serial.print(currentBtye, BIN);
        Serial.print(", flipped: ");
        Serial.println(currentBtye, BIN);
      }
    }

    renderRow(row, currentBtye, color);
  }
}

void renderRow(int row, uint16_t data, uint32_t color)
{
  if (DEBUG_MODE)
  {
    Serial.print("For row: ");
    Serial.println(row);
    Serial.print(", data: ");
    Serial.println(data, BIN);
  }

  for (uint8_t i = 0; i < 8; i++)
  {
    int currentByte = _BV(i) & data;
    int index = (row * 8) + i;

    if (DEBUG_MODE)
    {
      Serial.print("row: ");
      Serial.print(row * 8);
      Serial.print(", bitmask: ");
      Serial.print(_BV(i), BIN);
      Serial.print(", current byte: ");
      Serial.print(currentByte, BIN);
      Serial.print(", matrix index: ");
      Serial.print(index);
    }
    if (currentByte != 0)
    {
      if (DEBUG_MODE)
      {
        Serial.print(" index: ");
        Serial.print(index);
        Serial.print(": ON, ");
      }

      matrix.setPixelColor(index, color);
      // matrix.setPixelColor(index, Wheel(index * 2 & 255));
      matrix.show();
    }

    if (DEBUG_MODE)
      Serial.println("");
  }
}

uint16_t reverseByte(uint16_t byte, int length)
{
  uint16_t reversed = 0;
  for (uint8_t i = 0; i < length; i++)
  {
    reversed <<= 1;
    reversed += byte & 0x01;
    byte >>= 1;
  }
  return reversed;
}

void testGridFill()
{
  for (int i = 0; i < 8; i++)
  {
    testRowFill(i);
    delay(50);
  }
}

void testRowFill(int row)
{

  for (int i = 0; i < 8; i++)
  {
    int index = (row * 8) + i;
    matrix.setPixelColor(index, matrix.Color(0, 255, 255));
    matrix.show();
    // delay(50);
  }
}

void clearMatrix(uint32_t color)
{
  // * one by one for all 64
  for (int i = 0; i < 64; i++)
  {
    matrix.setPixelColor(i, color);
  }
  matrix.show();
}

void clearMatrixState()
{
  for (uint8_t i = 0; i < 8; i++)
  {
    matrixState[i] = 0;
  }
}

void clearRow(uint8_t row, uint32_t color)
{
  for (uint8_t i = 0; i < 8; i++)
  {
    matrix.setPixelColor(8 * row + i, backgroundColor);
  }
  matrix.show();
}

void clearRowState(uint8_t row)
{
  matrixState[row] = 0;
}

// Input a value 0 to 255 to get a color value.
// The colours are a transition r - g - b - back to r.
uint32_t Wheel(byte WheelPos)
{
  WheelPos = 255 - WheelPos;
  if (WheelPos < 85)
  {
    return matrix.Color(255 - WheelPos * 3, 0, WheelPos * 3);
  }
  if (WheelPos < 170)
  {
    WheelPos -= 85;
    return matrix.Color(0, WheelPos * 3, 255 - WheelPos * 3);
  }
  WheelPos -= 170;
  return matrix.Color(WheelPos * 3, 255 - WheelPos * 3, 0);
}

unsigned long animationInterval = 100;
unsigned long animationLastCheckpoint = 0;

void animate()
{
  // clearStrip(backgroundColor);
  // TODO: if the state has changed (need to track previous state), then render row, otherwise don't
  for (int row = 0; row < 8; row++)
  {
    if (matrixState[row] != previousMatrixState[row])
    {
      Serial.print("update needed for row: ");
      Serial.print(row);
      Serial.print(", current: ");
      Serial.print(matrixState[row], BIN);
      Serial.print(", previous: ");
      Serial.println(previousMatrixState[row], BIN);

      // TODO: ripout, we do this elsewhere
      previousMatrixState[row] = matrixState[row];

      // TODO: abstract
      uint8_t state = matrixState[row] & 0xFF;
      matrixState[row] >>= 8;
      uint8_t red = matrixState[row] & 0xFF;
      matrixState[row] >>= 8;
      uint8_t green = matrixState[row] & 0xFF;
      matrixState[row] >>= 8;
      uint8_t blue = matrixState[row] & 0xFF;

      uint32_t color = matrix.Color(red, green, blue);
      Serial.print("color: ");
      Serial.println(color, HEX);
      Serial.print("state: ");
      Serial.println(state, BIN);

      int renderByte = row % 2 == 0 ? state : reverseByte(state, 8);

      clearRow(row, backgroundColor);
      renderRow(row, renderByte, color);
    }
    // * Leaving in. this was when we were rendering the full matrix every time
    // render8x8State(matrixState, matrix.Color(255, 0, 255));
  }
}

void loop()
{
  // TODO: add a reconnect if not available
  if (client.available())
  {
    client.poll();
  }

  // unsigned long now = millis();
  // if (now - animationLastCheckpoint > animationInterval)
  // {
  //   animationLastCheckpoint = now;
  //   animate();
  // }
}
