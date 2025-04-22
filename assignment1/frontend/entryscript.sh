#!/bin/bash

if [ "$PRODUCTION" = "false" ]; then
  echo "Dev Mode"
  exec npm run dev
else
  echo "Production Mode"
  npm run build && exec npm run start
fi
