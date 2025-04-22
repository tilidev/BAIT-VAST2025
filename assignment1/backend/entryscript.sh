#!/bin/bash

# Check if the DEV_MODE environment variable is set
if [ "$PRODUCTION" = "false" ]; then
  echo "Dev Mode"
  exec python3 /usr/src/app/main.py --dev
else
  echo "Production Mode"
  exec python3 /usr/src/app/main.py
fi
