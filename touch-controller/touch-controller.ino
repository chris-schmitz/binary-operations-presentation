
#include "Adafruit_MPR121.h"
#include "credentials.h"
#include <ArduinoWebsockets.h>
#include <WiFi.h>
#include <Wire.h>

const char *ssid = WIFI_SSID;
const char *password = WIFI_PASSWORD;
// const char* websockets_server_host = "192.168.0.172"; //Enter server adress
const char *websockets_server_host = "192.168.4.2";  //Enter server adress
const uint16_t websockets_server_port = 3001;        // Enter server port

using namespace websockets;

WebsocketsClient client;

Adafruit_MPR121 cap = Adafruit_MPR121();

uint16_t previousTouchState = 0;
uint16_t currentTouchState = 0;

uint8_t touchControllerMessageType = 0b00000010;

void setup()
{
    Serial.begin(115200);

    connectToWifi();
    connectToWebsocketServer();
    connectToTouchBreakout();
}

void loop()
{
    // TODO: add check for wifi, if not reconnect
    // * let the websockets client check for incoming messages
    if (client.available())
    {
        client.poll();
    } // TODO: do we need a reconnect if we disconnect from wifi or if the server restarts??

    if (touchStateHasChanged())
    {
        sendTouchStateToServer();
    }

    // TODO: rewrite as a state machine with a debounce for the cap touch sensor
    delay(100);
}

void sendTouchStateToServer()
{
    uint32_t payload = formatPayload();
    client.sendBinary((char *)&payload, 32);
}

uint32_t formatPayload()
{
    uint32_t payload = 0;

    Serial.print("payload initialization: ");
    Serial.println(payload, BIN);

    // * push the touch state onto the payload
    payload += currentTouchState;

    Serial.print("payload with current touch state: ");
    Serial.println(payload, BIN);

    // * shift the bits over one byte so we can add the type byte
    payload <<= 8;

    Serial.print("payload shifted one byte: ");
    Serial.println(payload, BIN);

    // * add in our message type byte
    payload |= touchControllerMessageType;
    // ! note that since we shifted the payload over, this could also be done by addition
    // payload += touchControllerMessageType

    Serial.print("payload with type added on: ");
    Serial.println(payload, BIN);

    return payload;
}

bool touchStateHasChanged()
{

    currentTouchState = cap.touched();

    if (currentTouchState == previousTouchState)
    {

        return false;
    }
    Serial.println("touch state has changed!!");
    previousTouchState = currentTouchState;
    return true;
}

void connectToWifi()
{
    WiFi.begin(ssid, password);
    for (int i = 0; i < 10 && WiFi.status() != WL_CONNECTED; i++)
    {
        Serial.print(".");
        delay(1000);
    }

    // Check if connected to wifi
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("No Wifi!");
        return;
    }

    Serial.println("Connected to Wifi, Connecting to server.");
}

void connectToWebsocketServer()
{
    // try to connect to Websockets server
    bool connected = client.connect(websockets_server_host, websockets_server_port, "/");
    if (connected)
    {
        Serial.println("Connected!");
        // client.send(200);
        // client.send("Hello Server");
    }
    else
    {
        Serial.println("Unable to connect to websocket server :| ");
        while (1)
            ;
    }
}

void addWebsocketHooks()
{
    // run callback when messages are received
    client.onMessage([&](WebsocketsMessage message) {
        Serial.print("Got Message: ");
        Serial.println(message.data());
    });
}

void connectToTouchBreakout()
{
    if (!cap.begin(0x5A))
    {
        Serial.println("cap touch breakout not found");
        while (1)
            ;
    }
    Serial.println("cap touch breakout found!!");
}
