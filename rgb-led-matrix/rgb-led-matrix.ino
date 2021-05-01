#include "characters.h"
#include "credentials.h"
#include "data-classes.h"
#include "enumerables.h"
#include "helpers.h"
#include <ArduinoWebsockets.h>
#include <FastLED.h>
#include <WiFi.h>

#define _BV(bit) (1 << (bit))
#define MATRIX_PIN 12
#define TOTAL_LEDS 64

#define VERBOSE_MODE false

const char *ssid = WIFI_SSID;
const char *password = PASSWORD;
const char *websocket_server_host = WEBSOCKET_SERVER_HOST;
const uint16_t websocket_server_port = WEBSOCKET_SERVER_PORT;

uint8_t websocketReconnectTotalAttempts = 10;
uint8_t websocketReconnectCount = 0;

using namespace websockets;

WebsocketsClient client;

CRGB matrix[TOTAL_LEDS];

// uint32_t defaultBackgroundColor = CRGB(20, 20, 20);
CRGB defaultBackgroundColor = CRGB(0x2C3643);
CRGB backgroundColor = defaultBackgroundColor;

// TODO: ripout?
CRGB activeColor = CRGB(255, 0, 255);
// TODO: ripout, animation hapens on command with frames
unsigned long animationInterval = 100;
unsigned long animationLastCheckpoint = 0;

uint32_t previousMatrixState[8] = {0};
uint32_t matrixState[8] = {0};
// uint32_t playerState; // * byte 1 == row, byte 2 == column, color separated? we only have 4 bytes. no color for now
uint8_t playerRow; // * byte 1 == row, byte 2 == column, color separated? we only have 4 bytes. no color for now
uint8_t playerColumnState;
boolean collision = false;
int playerTargetPixel;
int previousPlayerTargetPixel;
uint8_t previousPlayerRow; // * byte 1 == row, byte 2 == column, color separated? we only have 4 bytes. no color for now
uint8_t previousPlayerColumnState;
boolean previousCollision = false;
CRGB playerColor = CRGB(255, 0, 255);

void setup()
{
  Serial.begin(115200);
  Serial.println("Setting up");
  FastLED.addLeds<WS2811, MATRIX_PIN, RGB>(matrix, TOTAL_LEDS);

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

    connectToWebsocketServer();
    Serial.println(data);
  }
}

void messageToGameFrame(std::string messageData, uint32_t length, uint32_t *gameFrame)
{
  if (VERBOSE_MODE)
  {
    Serial.println("--------------------------------");
    Serial.println("message data parse:");
  }

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

  if (VERBOSE_MODE)
  {
    for (int i = 0; i < 11; i++)
    {
      Serial.print(gameFrame[i], HEX);
      Serial.print(" == ");
      Serial.println(gameFrame[i], BIN);
    }

    Serial.println("--------------------------------");
  }
}

void setGameState(uint32_t *gameFrame, uint32_t length)
{
  setPlayerState(gameFrame[2]);

  // ! index 3 is where the brick information starts. prob a better way of handling this instead of magic numbers
  // TODO: move magic numbers out to constants?
  for (int i = 3; i < length; i++)
  {
    matrixState[i - 3] = gameFrame[i];
  }
}

void setPlayerState(uint32_t playerStateNumber)
{
  playerStateNumber >>= 8; // * chop unused byte

  collision = playerStateNumber & 0xFF;

  playerStateNumber >>= 8;
  playerRow = playerStateNumber & 0xFF;

  playerStateNumber >>= 8;
  playerColumnState = playerStateNumber & 0xFF;
}

void addWebsocketListener()
{
  Serial.println("Adding websocket listener");

  client.onEvent(onEventsCallback);

  client.onMessage([&](WebsocketsMessage message) {
    if (VERBOSE_MODE)
    {
      Serial.print("===> Got message from server <=== ");
    }

    std::string rawData = message.rawData();

    switch (getFirstMessageByte(rawData))
    {
    case GAME_FRAME:
      // TODO: refactor consideration
      // * if you end up refactoring the game logic into it's own class, move this to a private
      // * property.
      // ! also note that we can't move it out to a global var at the moment because we're dynamically
      // ! assigning the memory
      uint32_t gameFrame[message.length() / sizeof(uint32_t)]; // *try moving gameFrame out of scope

      messageToGameFrame(rawData, message.length(), gameFrame);
      setGameState(gameFrame, sizeof(gameFrame) / sizeof(gameFrame[0]));
      animate();
      break;
    case ART_FRAME:
      Serial.println("Art frame");
    }
  });
}

void renderRow(int row, uint16_t data, CRGB color)
{
  for (uint8_t i = 0; i < 8; i++)
  {
    int currentBit = _BV(i) & data;
    int index = (row * 8) + i;

    if (currentBit != 0)
    {
      if (matrix[index] != color)
      {
        matrix[index] = color;
      }
    }
    // else // TODO: if we wipe the whole matrix each time this is not needed
    // {
    //   matrix[index] = backgroundColor;
    // }

    if (VERBOSE_MODE)
      Serial.println("");
  }
}

void clearMatrix(CRGB color)
{
  // * one by one for all 64
  for (int i = 0; i < 64; i++)
  {
    matrix[i] = color;
  }
  FastLED.show();
}

void clearMatrixState()
{
  playerRow = 0;
  playerColumnState = 0;
  collision = 0;
  for (uint8_t i = 0; i < 8; i++)
  {
    matrixState[i] = 0;
  }
}

bool writeNewFrameToLEDs = false;

boolean frameHasChange()
{
  if (playerRow != previousPlayerRow || playerColumnState != previousPlayerColumnState)
  {
    return true;
  }

  for (int row = 0; row < 8; row++)
  {
    if (matrixState[row] != previousMatrixState[row])
    {
      return true;
    }
  }
  return false;
}

void writeBricksToMatrix()
{
  for (int row = 0; row < 8; row++)
  {
    previousMatrixState[row] = matrixState[row];

    BrickRow brickRow = BrickRow(matrixState[row]);
    // TODO: refactor: we can set the pixel color directly from the hex as long as it's in the right order
    CRGB color = CRGB(brickRow.red, brickRow.green, brickRow.blue);
    int renderByte = row % 2 == 0 ? brickRow.rowState : reverseByte(brickRow.rowState, 8);
    renderRow(row, renderByte, color);
  }
}

void writePlayerToMatrix()
{
  previousPlayerRow = playerRow;
  previousPlayerColumnState = playerColumnState;
  previousCollision = collision;
  previousPlayerTargetPixel = playerTargetPixel;

  int exponent = log(playerColumnState) / log(2);
  int column = playerRow % 2 == 0 ? exponent : 8 - exponent - 1;
  playerTargetPixel = playerRow * 8 + column;

  // TODO: troubleshoot starting here
  // Serial.print("pixel: ");
  // Serial.print(playerTargetPixel);
  // Serial.print(", color: ");
  // Serial.print(CRGB(0xFF00FF), HEX);
  // Serial.print(", ");
  // Serial.println(CRGB::Crimson, HEX);
  matrix[playerTargetPixel] = CRGB::Crimson;
}

void animate()
{
  if (!frameHasChange())
  {
    return;
  }

  if (collision)
  {
    clearMatrix(CRGB::OrangeRed);
  }
  else
  {
    clearMatrix(defaultBackgroundColor);
  }
  writeBricksToMatrix();
  writePlayerToMatrix();
  FastLED.show();
}

void loop()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    connectToWifi();
  }

  // TODO: add a reconnect if not available
  if (client.available())
  {
    client.poll();
  }
}
