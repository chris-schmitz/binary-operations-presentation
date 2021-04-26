#!/bin/bash

# smiley
printf "\xff\x99\x99\xff\xe7\xbd\xc3\xff" | websocat -b ws://localhost:3000
sleep 1
# count up
printf "\x01\x02\x03\x04\x05\x06\x07\x08" | websocat -b ws://localhost:3000
sleep 1
# Arrow
 printf "\xFF\x83\x87\x8F\x97\xBB\xFD\xFF" | websocat -b ws://localhost:3000
sleep 1
# Stairstep
printf "\x01\x03\x07\x0F\x1F\x3F\x7F\xFF"| websocat -b ws://localhost:3000
sleep 1
# fullGrid
printf "\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF" | websocat -b ws://localhost:3000
sleep 1
# randomPattern
printf "\xFF\xAA\x81\x99\x18\xE2\x47\xFF" | websocat -b ws://localhost:3000
sleep 1
# boxInBox and doors
printf "\xE7\x81\x81\x18\x18\x81\x81\xE7" | websocat -b ws://localhost:3000
sleep 1
# boxInBox
printf "\xFF\x81\x81\x99\x99\x81\x81\xFF" | websocat -b ws://localhost:3000
