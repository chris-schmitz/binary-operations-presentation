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

int matrixState[8] = {0};
// uint8_t matrixState[8] = {0};

Adafruit_NeoPixel matrix = Adafruit_NeoPixel(64, MATRIX_PIN, NEO_RGB + NEO_KHZ800);

uint32_t defaultBackgroundColor = matrix.Color(0, 255, 0);
uint32_t backgroundColor = defaultBackgroundColor;

void setup()
{
  Serial.begin(115200);
  Serial.println("Setting up");
  matrix.begin();
  matrix.show();

  clearMatrix(backgroundColor);

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

    clearMatrix(backgroundColor);
    // TODO: come back and give better names
    for (int i = 0; i < strlen(data); i++)
    {
      uint8_t currentByte = data[i];
      matrixState[i] = currentByte;
      Serial.print("row: ");
      Serial.print(i);
      Serial.print(", byte: ");
      Serial.println(currentByte, BIN);
    }
  });
}

void render8x8State(int *state, uint32_t color)
{
  for (int row = 0; row < 8; row++)
  {
    int currentBtye = state[row];
    // Serial.print("State row ");
    // Serial.print(row);
    // Serial.print(": ");
    // Serial.println(currentBtye);

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

void clearMatrix(uint32_t color)
{
  // * one by one for all 64
  for (int i = 0; i < 64; i++)
  {
    matrix.setPixelColor(i, color);
  }
  matrix.show();

  clearState();
}

void clearState()
{
  for (uint8_t i = 0; i < 8; i++)
  {
    matrixState[i] = 0;
  }
}

void clearRow(uint8_t row, uint32_t color) {}

unsigned long animationInterval = 100;
unsigned long animationLastCheckpoint = 0;

void animate()
{
  // clearStrip(backgroundColor);
  // TODO: if the state has changed (need to track previous state), then render row, otherwise don't
  for (int index = 0; index < 8; index++)
  {
    render8x8State(matrixState, matrix.Color(255, 0, 255));
  }
}

void loop()
{
  // TODO: add a reconnect if not available
  if (client.available())
  {
    client.poll();
  }

  unsigned long now = millis();
  if (now - animationLastCheckpoint > animationInterval)
  {
    animate();
  }
}
