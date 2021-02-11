#!/bin/bash

printf "\x80\x00\x80\x80\x00\x00\x00\x80" | websocat -b ws://cs-touchscreen.local:3001
sleep 1
# printf "\x40\x80\x40\x40\x00\x00\x00\x40" | websocat -b ws://cs-touchscreen.local:3001
# sleep 1