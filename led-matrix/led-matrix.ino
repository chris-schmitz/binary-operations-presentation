#include "credentials.h"
#include <ArduinoWebsockets.h>
#include <WiFi.h>

#define _BV(bit) (1 << (bit))

const char *ssid = SSID;
const char *password = PASSWORD;
const char *websocket_server_host = WEBSOCKET_SERVER_HOST;
const uint16_t websocket_server_port = WEBSOCKET_SERVER_PORT;

using namespace websockets;

WebsocketsClient client;

int Max7219_pinCLK = 22;
int Max7219_pinCS = 21;
int Max7219_pinDIN = 5;

uint8_t matrixState[8] = {0};

void Write_Max7219_byte(unsigned char DATA)
{

  unsigned char i;
  digitalWrite(Max7219_pinCS, LOW);
  for (i = 8; i >= 1; i--)

  {
    digitalWrite(Max7219_pinCLK, LOW);
    digitalWrite(Max7219_pinDIN, DATA & 0x80); // Extracting a bit data
    DATA = DATA << 1;
    digitalWrite(Max7219_pinCLK, HIGH);
  }
}

void printByteWithPadding(unsigned char value)
{
  int exponent = log(value) / log(2);
  int zerosNeeded = 8 - exponent - 1;

  String padding = "";
  for (int i = 0; i < zerosNeeded; i++)
  {
    padding += "0";
  }
  // Serial.print("padding and number: ");
  Serial.print(padding);
  Serial.print(value, BIN);
}

void Write_Max7219(unsigned char address, unsigned char dat)
{

  // ! Leaving in for troubleshooting aid
  // Serial.print("Data: ");
  // printByteWithPadding(dat);

  // Serial.print("  ->  ");
  // Serial.print("Address: ");
  // Serial.println(address, BIN);

  digitalWrite(Max7219_pinCS, LOW);
  Write_Max7219_byte(address); //address，code of LED
  Write_Max7219_byte(dat);     //data，figure on LED
  digitalWrite(Max7219_pinCS, HIGH);
}

void Init_MAX7219(void)
{

  Write_Max7219(0x09, 0x00); //decoding ：BCD
  Write_Max7219(0x0a, 0x03); //brightness
  Write_Max7219(0x0b, 0x07); //scanlimit；8 LEDs
  Write_Max7219(0x0c, 0x01); //power-down mode：0，normal mode：1
  Write_Max7219(0x0f, 0x00); //test display：1；EOT，display：0
}

void setup()
{
  Serial.begin(115200);
  pinMode(Max7219_pinCLK, OUTPUT);
  pinMode(Max7219_pinCS, OUTPUT);
  pinMode(Max7219_pinDIN, OUTPUT);
  delay(50);

  Init_MAX7219();
  clearMatrix();
  connectToWifi();
}

void clearMatrix()
{
  for (int i = 0; i < 8; i++)
  {
    Write_Max7219(i + 1, 0);
  }
}

void connectToWifi()
{

  WiFi.begin(ssid, password);
  for (int i = 0; i < 10 && WiFi.status() != WL_CONNECTED; i++)
  {
    Serial.print(".");
    Serial.print(WiFi.status());
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
    // Serial.print("c string: ");``
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
    Write_Max7219(i + 1, matrixState[i]);
    matrixState[i] >>= 1;
  }
}

unsigned long animationInterval = 800;
unsigned long animationLastChecked = 0;

void loop()
{
  if (client.available())
  {
    client.poll();
  }

  unsigned long now = millis();

  if (now - animationLastChecked >= animationInterval)
  {
    animate();
    animationLastChecked = now;
  }
}
