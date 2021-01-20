#include "characters.h"
#include "credentials.h"
#include <Adafruit_NeoPixel.h>
#include <ArduinoWebsockets.h>
#include <WiFi.h>

#define _BV(bit) (1 << (bit))
#define MATRIX_PIN 12
#define DEBUG_MODE false

const char *ssid = WIFI_SSID;
const char *password = PASSWORD;
const char *websocket_server_host = WEBSOCKET_SERVER_HOST;
const uint16_t websocket_server_port = WEBSOCKET_SERVER_PORT;

uint8_t websocketReconnectTotalAttempts = 10;
uint8_t websocketReconnectCount = 0;

using namespace websockets;

WebsocketsClient client;

uint8_t matrixState[8] = {0};

Adafruit_NeoPixel matrix = Adafruit_NeoPixel(64, MATRIX_PIN, NEO_RGB + NEO_KHZ800);

void setup()
{
  Serial.begin(115200);
  Serial.println("Setting up");
  matrix.begin();
  matrix.show();

  for (uint8_t i = 0; i < 8; i++)
  {
    matrixState[i] = i;
  }

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
}

void addWebsocketListener()
{
  Serial.println("Adding websocket listener");

  client.onMessage([&](WebsocketsMessage message) {
    Serial.print("Got message: ");
    Serial.println(message.data());

    const char *data = message.c_str();
    Serial.print("Extracted data: ");
    Serial.println(data);

    // TODO: come back and give better names
    for (int i = 0; i < strlen(data); i++)
    {
      uint8_t currentByte = data[i];

      for (uint8_t currentBit = 0; currentBit < 8; currentBit++)
      {
        uint8_t state = currentByte & _BV(currentBit) ? 0x80 : 0;

        Serial.print("row: ");
        Serial.print(currentBit);
        Serial.print(", state: ");
        Serial.println(state, BIN);

        matrixState[i] |= state;
      }
    }
  });
}

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

    // delay(300);
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
  for (uint8_t i = 0; i < 8; i++) // TODO rewrite to dynamically determine size just to keep it clean
  {
    int currentByte = _BV(i) & data;
    int index = (row * 8) + i;
    // int exponent = (int)(log(currentByte) / log(2));

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
      matrix.show();
      // delay(50);
    }
    else
    {
      if (DEBUG_MODE)
      {
        Serial.print(" index: ");
        Serial.print(index);
        Serial.print(": OFF, ");
      }
      // matrix.setPixelColor(index, matrix.Color(0, 0, 0));
    }
    if (DEBUG_MODE)
      Serial.println("");
  }
  // matrix.show();
  delay(10);
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

void clearStrip(uint32_t color)
{
  // * one by one for all 64
  for (int i = 0; i < 64; i++)
  {
    matrix.setPixelColor(i, color);
  }
  matrix.show();
}

void loop()
{
  if (client.available())
  {
    client.poll();
  }
  // TODO: add a reconnect if not available

  return;

  // TODO: clean alllllllll of this up

  clearStrip(matrix.Color(0, 255, 0));
  render8x8State(O, matrix.Color(255, 0, 255));
  delay(1000);
  clearStrip(matrix.Color(0, 255, 0));
  render8x8State(H, matrix.Color(255, 0, 255));
  delay(1000);
  clearStrip(matrix.Color(0, 255, 0));
  render8x8State(space, matrix.Color(255, 0, 255));
  delay(1000);
  clearStrip(matrix.Color(0, 255, 0));
  render8x8State(Y, matrix.Color(255, 0, 255));
  delay(1000);
  clearStrip(matrix.Color(0, 255, 0));
  render8x8State(E, matrix.Color(255, 0, 255));
  delay(1000);
  clearStrip(matrix.Color(0, 255, 0));
  render8x8State(A, matrix.Color(255, 0, 255));
  delay(1000);
  clearStrip(matrix.Color(0, 255, 0));
  render8x8State(H, matrix.Color(255, 0, 255));
  delay(1000);
  clearStrip(matrix.Color(0, 255, 0));
  render8x8State(tripleBang, matrix.Color(255, 0, 255));
  delay(1000);
  clearStrip(matrix.Color(0, 255, 0));
  return;

  // * one by one for all 64
  for (int i = 0; i < 64; i++)
  {
    matrix.setPixelColor(i, matrix.Color(255, 0, 0));
    matrix.show();
    delay(50);
  }
  delay(3000);
  clearStrip(matrix.Color(0, 0, 0));

  // * Row by row without function calls
  for (int i = 0; i < 8; i++)
  {
    for (int j = 0; j < 8; j++)
    {
      matrix.setPixelColor((8 * i) + j, matrix.Color(0, 255, 0));
    }
    matrix.show();
    delay(50);
  }
  delay(3000);
  clearStrip(matrix.Color(0, 0, 0));

  // * Row by row extracted to two functions
  testGridFill();
  delay(1000);
  clearStrip(matrix.Color(0, 0, 0));

  // * original row by row
  render8x8State(fullGrid, matrix.Color(255, 255, 0));
  clearStrip(matrix.Color(0, 0, 0));

  delay(1000);

  // * original row by row
  render8x8State(boxInBox, matrix.Color(255, 255, 255));
  clearStrip(matrix.Color(0, 0, 0));

  delay(1000);
  // matrix.clear();
  clearStrip(matrix.Color(0, 0, 0));
}
