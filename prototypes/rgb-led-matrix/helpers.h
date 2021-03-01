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

#endif
