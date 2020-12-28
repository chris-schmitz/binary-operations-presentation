#include <ArduinoWebsockets.h>
#include <WiFi.h>

const char *ssid = "cs-touchscreen";
const char *password = "ohSoSecret!!";
const char *websocket_server_host = "192.168.4.19";
const uint16_t websocket_server_port = 3001;

using namespace websockets;

WebsocketsClient client;

int Max7219_pinCLK = 22;
int Max7219_pinCS = 21;
int Max7219_pinDIN = 5;

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
  /*
  Serial.print("Zeros needed: ");
  Serial.println(zerosNeeded);
  Serial.print("Value: ");
  Serial.println(value, BIN);
  Serial.print("Exponent: ");
  Serial.println(exponent);
  */
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

  Serial.print("Data: ");
  printByteWithPadding(dat);

  Serial.print("  ->  ");
  Serial.print("Address: ");
  Serial.println(address, BIN);

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

    const char *data = message.c_str();

    Serial.print("Data: ");
    Serial.println(data);
    // Serial.println(message.data()[0], BIN);
    // Serial.println(message.c_str()[0], BIN);
    // Serial.println(message.rawData()[0], BIN);

    // Write_Max7219(1, strtol(message.data()));

    // printByteWithPadding(message);

    // Serial.print("  ->  ");
    // Serial.print("Address: ");
    // Serial.println(address, BIN);

    // String grid = message.data();

    // char delimiter[] = "\n";
    // int size = strlen(data);
    // char *pointer = strtok((char *)data, delimiter);

    // int i = 1;
    // while (pointer != NULL)
    // {
    //   Serial.print("pointer: ");
    //   Serial.println(pointer);
    //   pointer = strtok(NULL, delimiter);
    //   int num = atoi((const char *)*pointer);
    //   Serial.print("num: ");
    //   Serial.println(num);
    //   Write_Max7219(i, num);
    //   i++;
    // }

    for (int i = 0; i < strlen(data); i++)
    {
      Serial.println("========================");
      // Serial.print("loop: ");
      // Serial.println(i);

      // Serial.print("char version: ");
      // Serial.println(data[i]);

      // int num = atoi(&data[i]);

      // Serial.print("int version: ");
      // Serial.println(num);

      Write_Max7219(i + 1, data[i]);
    }
  });
}

// unsigned char dot[4][8] = {
//     //  {0x0, 0x0, 0x0, 0x18, 0x18, 0x0, 0x0, 0x0}
//     {0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x7C}, //L
//     {0x7C, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x7C}, //I
//     {0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x7C}, //L
//     {0x41, 0x22, 0x14, 0x8, 0x8, 0x8, 0x8, 0x8},      //Y
// };
// unsigned char frame[8] = {80, 0, 40, 29, 29, 96, 2, 34};

void loop()
{
  if (client.available())
  {
    client.poll();
  }
  for (int i = 0; i < 8; i++)
  {
    // Write_Max7219(i + 1, frame[i]);
  }
}
