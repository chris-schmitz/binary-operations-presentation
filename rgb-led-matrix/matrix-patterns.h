#include "FastLED.h"

enum Patterns
{
    CHECKER_PATTERN,
    RADIATE_PATTERN
};

const CRGB pattern_checker_even[64] = {
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
};
const CRGB pattern_checker_odd[64] = {
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
    CRGB(0x1F64F6),
    CRGB(0xF3C029),
};

const byte RADIATE[][8] = {
    {B00000000,
     B00000000,
     B00000000,
     B00000000,
     B00000000,
     B00000000,
     B00000000,
     B00000000},
    {B00000000,
     B00000000,
     B00000000,
     B00011000,
     B00011000,
     B00000000,
     B00000000,
     B00000000},
    {B00000000,
     B00000000,
     B00111100,
     B00100100,
     B00100100,
     B00111100,
     B00000000,
     B00000000},
    {B00000000,
     B01111110,
     B01000010,
     B01000010,
     B01000010,
     B01000010,
     B01111110,
     B00000000},
    {B11111111,
     B10000001,
     B10000001,
     B10000001,
     B10000001,
     B10000001,
     B10000001,
     B11111111},
    {B00000000,
     B00000000,
     B00000000,
     B00000000,
     B00000000,
     B00000000,
     B00000000,
     B00000000},
};
const int RADIATE_LENGTH = sizeof(RADIATE) / 8;

CRGB ON = CRGB(0x77F84C);
CRGB OFF = CRGB(0xE948F0);

void checkerPatternRunner(CRGB *matrix)
{
    for (int i = 0; i < 64; i++)
    {
        matrix[i] = pattern_checker_even[i];
    }
    FastLED.show();
    delay(100);
    for (int i = 0; i < 64; i++)
    {
        matrix[i] = pattern_checker_odd[i];
    }
    FastLED.show();
    delay(150);
}

void renderCurrentFrame(const byte *frame, CRGB *matrix)
{
    for (uint8_t i = 0; i < 8; i++)
    {
        byte row = frame[i];
        byte mask = 0b01;
        for (uint8_t j = 0; j < 8; j++)
        {
            // TODO: add in byte flip for odd rows
            Serial.print(row, BIN);
            Serial.print(" - ");
            Serial.print(mask, BIN);
            Serial.print(" - ");
            Serial.print(row & mask, BIN);
            Serial.print(" - ");
            Serial.println((row & mask) > 0);
            if ((row & mask) > 0)
            {
                matrix[i * 8 + j] = ON;
            }
            else
            {
                matrix[i * 8 + j] = OFF;
            }
            mask <<= 1;
        }
    }
}

void radiatePatternRunner(CRGB *matrix)
{
    for (uint8_t i = 0; i < RADIATE_LENGTH; i++)
    {
        const byte *currentFrame = RADIATE[i];
        renderCurrentFrame(currentFrame, matrix);
        Serial.println("show");
        Serial.println("==========");
        FastLED.show();
        delay(50);
    }
}

void runPattern(Patterns pattern, CRGB *matrix)
{
    switch (pattern)
    {
    case CHECKER_PATTERN:
        checkerPatternRunner(matrix);
        break;
    case RADIATE_PATTERN:
        radiatePatternRunner(matrix);
        break;
    }
}
