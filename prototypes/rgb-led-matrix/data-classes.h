#ifndef BIN_DEMO_DATA_CLASSES_H
#define BIN_DEMO_DATA_CLASSES_H
struct BrickRow
{
  uint8_t red = 0;
  uint8_t green = 0;
  uint8_t blue = 0;
  uint8_t rowState = 0;

  BrickRow(uint32_t data)
  {
    // TODO: abstract and refactor. as liong as the hex is in the right order we don't need to break out the RGB, we can setPixelColor with just a 32bit integer
    rowState = data & 0xFF;
    data >>= 8;
    red = data & 0xFF;

    data >>= 8;
    green = data & 0xFF;

    data >>= 8;
    blue = data & 0xFF;
  }
};
#endif