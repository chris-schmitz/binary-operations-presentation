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

  connectToWifi();
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
//    if (reconnectCount < totalReconnectTries)
//    {
//      reconnectCount++;
//      delay(5000);
//      connectToWebsocketServer();
//    }
  }
}

void addWebsocketListeners()
{
  Serial.println("Adding websocket listeners");
//  client.onMessage([&](WebsocketsMessage message) {
//    Serial.print("Received message from server: ");
//    Serial.println(message.data());
//  });
    // run callback when messages are received

      client.onMessage([&](WebsocketsMessage message) {
        Serial.print("Got Message: ");
        Serial.println(message.data());
    });
}

// unsigned char dot[4][8] = {
//     //  {0x0, 0x0, 0x0, 0x18, 0x18, 0x0, 0x0, 0x0}
//     {0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x7C}, //L
//     {0x7C, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x7C}, //I
//     {0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x7C}, //L
//     {0x41, 0x22, 0x14, 0x8, 0x8, 0x8, 0x8, 0x8},      //Y
// };
 unsigned char frame[8] ={ 80, 0, 40, 29, 29, 96, 2, 34 };

void loop()
{
  if(client.available()){
    client.poll();
  }
   for (int i = 0; i < 8; i++)
   {
     Write_Max7219(i+1, frame[i]);
   }
}
