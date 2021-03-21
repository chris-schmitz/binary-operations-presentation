#ifndef BIN_DEMO_HELPERS_H
#define BIN_DEMO_HELPERS_H
#include <stdint.h>
#include <stdlib.h>
#include <string>

char getFirstMessageByte(std::string message)
{

  char firstByte = message.at(0);
  return firstByte;
}

uint16_t reverseByte(uint16_t byte, int length)
{
  uint16_t reversed = 0;
  for (uint8_t i = 0; i < length; i++)
  {
    reversed <<= 1;
    reversed += byte & 0x01; // TODO: change to |=
    byte >>= 1;
  }
  return reversed;
}

#endif
