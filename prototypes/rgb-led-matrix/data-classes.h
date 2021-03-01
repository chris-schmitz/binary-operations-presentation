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
    // TODO: abstract
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