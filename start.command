#!/bin/bash
# Data Spark Graphics Studio — doppio click per aprire l'app.
# Serve un server locale (senza, il browser blocca l'export delle foto).
cd "$(dirname "$0")"
PORT=8420
( sleep 1; open "http://localhost:$PORT" ) &
echo "Graphics Studio su http://localhost:$PORT — chiudi questa finestra per fermare."
python3 -m http.server $PORT
