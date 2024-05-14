#!/bin/bash


for port in $(seq 40000 40099); do
  pid=$(lsof -t -i:$port)
  if [ -n "$pid" ]; then
    echo "Killing process on port $port with PID $pid"
    kill -9 $pid
  else
    echo "No process running on port $port"
  fi
done