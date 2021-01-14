#include "credentials.h"
#include <Adafruit_NeoPixel.h>
#include <ArduinoWebsockets.h>
#include <WiFi.h>

#define _BV(bit) (1 << (bit))
#define MATRIX_PIN 32

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
  Serial.print(padding);
  Serial.print(value, BIN);
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

    // ! Leaving in for troubleshooting purposes
    // Serial.print("message type binary: ");
    // Serial.println(message.type() == MessageType::Binary);
    // Serial.print("message type text: ");
    // Serial.println(message.type() == MessageType::Text);
    // Serial.print("Is binary: ");
    // Serial.println(message.isBinary());
    // Serial.print("Is text: ");
    // Serial.println(message.isText());
    // Serial.print("c string: ");
    // Serial.println(message.c_str());

    const char *data = message.c_str();

    Serial.print("Data: ");
    Serial.println(data);

    for (int i = 0; i < strlen(data); i++)
    {
      uint8_t currentBtye = data[i];

      for (uint i = 0; i < 8; i++)
      {
        uint8_t state = currentBtye & _BV(i) ? 0x80 : 0;

        Serial.print("bit: ");
        Serial.print(i);
        Serial.print(", data: ");
        Serial.print(data[i]);
        Serial.print(", state: ");
        Serial.println(state);

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

void loop()
{
  // for (int row = 0; row < 8 * 8; row += 8)
  // { // loop through each row
  //   matrix.clear();
  //   matrix.show();
  //   for (uint8_t pixel = 0; pixel < 8; pixel++)
  //   { // loop through each row
  //     Serial.print("row: ");
  //     Serial.print(row);
  //     Serial.print(", pixel: ");
  //     Serial.print(pixel);
  //     Serial.print(", index: ");
  //     int index = log(matrixState[pixel]) / log(2);

  //     matrixState[pixel] <<= 1;

  //     Serial.print(index);
  //     Serial.print(", row plus index: ");
  //     Serial.println(row + index);

  //     matrix.setPixelColor(row + index, matrix.Color(3, 66, 128));
  //   }
  //   matrix.show();
  //   delay(100);
  // }

  for (int row = 0; row < 8 * 8; row += 8)
  {
    int index = 1;
    for (int i = 0; i < 8; i++)
    {
      int exponent = log(index) / log(2);
      matrix.setPixelColor(row + exponent - 1, matrix.Color(0, 0, 0));
      matrix.setPixelColor(row + exponent, matrix.Color(3, 66, 128));
      matrix.show();
      index <<= 1;
      delay(500);
    }
  }
  matrix.clear();
  matrix.show();

  // if (client.available())
  // {
  //   client.poll();
  // }

  // unsigned long now = millis();

  // if (now - animationLastChecked >= animationInterval)
  // {
  //   animate();
  //   animationLastChecked = now;
  // }
}
