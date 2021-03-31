#include <FastLED.h>

#define _BV(bit) (1 << (bit))
// #define MATRIX_PIN 1
// #define MATRIX_PIN 32
#define MATRIX_PIN 12

#define DEBUG_MODE false

uint8_t matrixState[8] = {0};

#define TOTAL_LEDS 64

CRGB matrix[TOTAL_LEDS];

void setup()
{
  delay(2000);
  Serial.begin(115200);
  FastLED.addLeds<WS2811, MATRIX_PIN, RGB>(matrix, TOTAL_LEDS);

  for (uint8_t i = 0; i < 8; i++)
  {
    matrixState[i] = i;
  }
}

void render8x8State(int *state, CRGB color)
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

void renderRow(int row, uint16_t data, CRGB color)
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
      matrix[index] = color;
      FastLED.show();
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
    }
    if (DEBUG_MODE)
      Serial.println("");
  }
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
    matrix[index] = CRGB::DarkGoldenrod;
    FastLED.show();
    // delay(50);
  }
}

void clearStrip()
{
  // * one by one for all 64
  for (int i = 0; i < 64; i++)
  {
    matrix[i] = CRGB::Black;
  }
  FastLED.show();
}

void loop()
{

  int stairStep[8] = {0x01, 0x03, 0x07, 0x0F, 0x1F, 0x3F, 0x7F, 0xFF};
  int fullGrid[8] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  int random[8] = {0xFF, 0xAA, 0x81, 0x99, 0x18, 0xE2, 0x47, 0xFF};
  int boxInBox[8] = {0xFF, 0x81, 0x81, 0x99, 0x99, 0x81, 0x81, 0xFF};

  int L[8] = {0, 0x30, 0x30, 0x30, 0x30, 0x3c, 0x3c, 0};
  int I[8] = {0, 0x3c, 0x18, 0x18, 0x18, 0x18, 0x3c, 0};
  int Y[8] = {0, 0x66, 0x66, 0x3c, 0x18, 0x18, 0x18, 0};

  int O[8] = {0, 0x18, 0x24, 0x24, 0x24, 0x24, 0x18, 0};
  int H[8] = {0, 0x24, 0x24, 0x24, 0x3c, 0x24, 0x24, 0};
  int E[8] = {0, 0x3c, 0x20, 0x3c, 0x20, 0x20, 0x3c, 0};
  int A[8] = {0, 0x18, 0x24, 0x24, 0x3c, 0x24, 0x24, 0};
  int tripleBang[8] = {0, 0x54, 0x54, 0x54, 0x54, 0x0, 0x54, 0};
  int space[8] = {0, 0, 0, 0, 0, 0, 0, 0};

  render8x8State(boxInBox, CRGB::Aquamarine);
  delay(1000);
  clearStrip();
  FastLED.show();
  render8x8State(fullGrid, CRGB::Violet);
  delay(1000);
  clearStrip();
  FastLED.show();
  render8x8State(stairStep, CRGB::Thistle);
  delay(1000);
  clearStrip();
  FastLED.show();
  render8x8State(random, CRGB::Tomato);
  delay(1000);
  clearStrip();
  FastLED.show();

  clearStrip();
  render8x8State(O, CRGB::SteelBlue);
  delay(500);
  clearStrip();
  render8x8State(H, CRGB::SteelBlue);
  delay(500);
  clearStrip();
  render8x8State(space, CRGB::SteelBlue);
  delay(500);
  clearStrip();
  render8x8State(Y, CRGB::SteelBlue);
  delay(500);
  clearStrip();
  render8x8State(E, CRGB::SteelBlue);
  delay(500);
  clearStrip();
  render8x8State(A, CRGB::SteelBlue);
  delay(500);
  clearStrip();
  render8x8State(H, CRGB::SteelBlue);
  delay(500);
  clearStrip();
  render8x8State(tripleBang, CRGB::SteelBlue);
  delay(500);
  clearStrip();
  return;
}
