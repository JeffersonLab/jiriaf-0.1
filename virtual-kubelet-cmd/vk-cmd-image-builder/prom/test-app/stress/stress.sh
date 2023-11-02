#!/bin/sh
stress-ng -c 2 --timeout 300 --metrics-brief & stress-ng -c 1 --timeout 300 --metrics-brief & sleep 135 & sleep 246