#include "credentials.h"
#include <Adafruit_NeoPixel.h>
#include <ArduinoWebsockets.h>
#include <WiFi.h>

#define _BV(bit) (1 << (bit))
#define MATRIX_PIN 32

#define DEBUG_MODE false

const char *ssid = WIFI_SSID;
const char *password = PASSWORD;
const char *websocket_server_host = WEBSOCKET_SERVER_HOST;
const uint16_t websocket_server_port = WEBSOCKET_SERVER_PORT;

using namespace websockets;

WebsocketsClient client;

Adafruit_NeoPixel matrix = Adafruit_NeoPixel(64, MATRIX_PIN, NEO_GRB + NEO_KHZ800);

uint8_t matrixState[8] = {0};

void printByteWithPadding(unsigned char value)
{
  int exponent = log(value) / log(2);
  int zerosNeeded = 8 - exponent - 1;

  String padding = "";
  for (int i = 0; i < zerosNeeded; i++)
  {
    padding += "0";
  }
  if (DEBUG_MODE)
  {
    Serial.print(padding);
    Serial.print(value, BIN);
  }
}

void setup()
{
  Serial.begin(115200);
  matrix.begin();
  matrix.clear();
  matrix.show();

  for (uint8_t i = 0; i < 8; i++)
  {
    matrixState[i] = i;
  }

  // connectToWifi();
}

void connectToWifi()
{

  WiFi.begin(ssid, password);
  for (int i = 0; i < 10 && WiFi.status() != WL_CONNECTED; i++)
  {
    Serial.print(".");
    // Serial.print(WiFi.status());
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

uint8_t reconnectCount = 0;
uint8_t totalReconnectTries = 10;
void connectToWebsocketServer()
{
  Serial.println("Connecting to websocket server");
  bool connected = client.connect(websocket_server_host, websocket_server_port, "/");

  if (connected)
  {
    Serial.println("Connected to websocket server.");
    addWebsocketListeners();
  }
  else
  {
    Serial.println("Unable to connect to websocket server.");
    if (reconnectCount < totalReconnectTries)
    {
      reconnectCount++;
      delay(5000);
      connectToWebsocketServer();
    }
  }
}

void addWebsocketListeners()
{
  Serial.println("Adding websocket listeners");

  client.onMessage([&](WebsocketsMessage message) {
    Serial.print("Got Message: ");
    Serial.println(message.data());

    if (DEBUG_MODE)
    {

      Serial.print("message type binary: ");
      Serial.println(message.type() == MessageType::Binary);
      Serial.print("message type text: ");
      Serial.println(message.type() == MessageType::Text);
      Serial.print("Is binary: ");
      Serial.println(message.isBinary());
      Serial.print("Is text: ");
      Serial.println(message.isText());
      Serial.print("c string: ");
      Serial.println(message.c_str());
    }

    const char *data = message.c_str();

    Serial.print("Data: ");
    Serial.println(data);

    for (int i = 0; i < strlen(data); i++)
    {
      uint8_t currentBtye = data[i];

      for (uint i = 0; i < 8; i++)
      {
        uint8_t state = currentBtye & _BV(i) ? 0x80 : 0;

        if (DEBUG_MODE)
        {
          Serial.print("bit: ");
          Serial.print(i);
          Serial.print(", data: ");
          Serial.print(data[i]);
          Serial.print(", state: ");
          Serial.println(state);
        }

        matrixState[i] |= state;
      }
    }
  });
}

void animate()
{
  for (int i = 0; i < 8; i++)
  {

    Serial.println("matrix state:");
    for (int i = 0; i < 8; i++)
    {
      Serial.print(matrixState[i]);
      Serial.print(" ");
    }

    Serial.println("");
    // Write_Max7219(i + 1, matrixState[i]);
    matrixState[i] >>= 1;
  }
}

unsigned long animationInterval = 800;
unsigned long animationLastChecked = 0;

void render8x8State(int *state, uint16_t color)
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

    delay(300);
  }
}

void renderRow(int row, uint16_t data, uint16_t color)
{
  if (DEBUG_MODE)
  {
    Serial.print("For row: ");
    Serial.println(row);
    Serial.print(", data: ");
    Serial.println(data, BIN);
  }
  for (uint8_t i = 0; i < 8; i++) // TODO rewrite to dynamically determine size just to keep it clean
  {
    int currentByte = _BV(i) & data;
    int index = (row * 8) + (log(currentByte) / log(2));

    if (DEBUG_MODE)
    {
      Serial.print("bitmask: ");
      Serial.print(_BV(i), BIN);
      Serial.print(", current byte: ");
      Serial.print(currentByte, BIN);
      Serial.print(", matrix index: ");
      Serial.print(index);
    }
    if (currentByte != 0)
    {
      if (DEBUG_MODE)
        Serial.print(" 1");
      matrix.setPixelColor(index, color);
    }
    else
    {
      matrix.setPixelColor(index, matrix.Color(0, 0, 0));
    }
    if (DEBUG_MODE)
      Serial.println("");
  }
  matrix.show();
  delay(100);
}

uint16_t reverseByte(uint16_t byte, int length)
{
  uint_fast16_t reversed = 0;
  for (uint8_t i = 0; i < length; i++)
  {
    reversed <<= 1;
    reversed += byte & 0x01;
    byte >>= 1;
  }
  return reversed;
}

void loop()
{

  int stairStep[8] = {0x01, 0x03, 0x07, 0x0F, 0x1F, 0x3F, 0x7F, 0xFF};
  int fullGrid[8] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  int random[8] = {0xFF, 0xAA, 0x81, 0x99, 0x18, 0xE2, 0x47, 0xFF};
  int boxInBox[8] = {0xFF, 0x81, 0x81, 0x18, 0x18, 0x81, 0x81, 0xFF};

  render8x8State(boxInBox, matrix.Color(255, 0, 255));
  matrix.clear();
  matrix.show();
  render8x8State(fullGrid, matrix.Color(121, 20, 23));
  matrix.clear();
  matrix.show();
  render8x8State(stairStep, matrix.Color(217, 175, 45));
  matrix.clear();
  matrix.show();
  render8x8State(random, matrix.Color(36, 159, 233));
  matrix.clear();
  matrix.show();

  matrix.clear();
  matrix.show();

  for (int i = 0; i < 64; i++)
  {
    matrix.setPixelColor(i, matrix.Color(0, 255, 0));
    matrix.show();
    delay(50);
  }
  delay(1000);
  matrix.clear();
  matrix.show();
}
