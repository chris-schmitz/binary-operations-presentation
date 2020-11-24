
#include "Adafruit_MPR121.h"
#include "credentials.h"
#include <ArduinoWebsockets.h>
#include <WiFi.h>
#include <Wire.h>

const char *ssid = WIFI_SSID;
const char *password = WIFI_PASSWORD;
// const char* websockets_server_host = "192.168.0.172"; //Enter server adress
const char *websockets_server_host = "192.168.4.14"; //Enter server adress
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

    uint32_t payload = 0;
    payload |= touchControllerMessageType;
    payload = payload << 12;

    currentTouchState = cap.touched();
    currentTouchState = 0b0000000000000011; // * faking out touch state to test

    if (currentTouchState != previousTouchState)
    {
        payload |= currentTouchState;

        client.sendBinary((char *)&payload, 32);
        previousTouchState = currentTouchState;
    }
    delay(500);

    // if (touchStateHasChanged())
    // {
    //     sendTouchStateToServer();
    // }

    // Serial.println(cap.touched(), BIN);
    // delay(500);
}

void sendTouchStateToServer()
{
    Serial.println("sending state to server");

    uint32_t payload = touchControllerMessageType << 12;
    Serial.println(payload);
    payload |= currentTouchState;

    Serial.print("Payload contents: ");
    Serial.println(payload);
    Serial.print("Payload contents: ");
    Serial.println((char *)&payload);
    Serial.print("Payload size: ");
    Serial.println(sizeof(payload));

    client.sendBinary((char *)&payload, 32);
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
