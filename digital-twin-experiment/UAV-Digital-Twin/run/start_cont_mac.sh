#!/bin/bash

docker run -it -e DISPLAY=host.docker.internal:0 -v /Users/jeng-yuantsai/cache/UAV-Digital-Twin/src:/digitaltwin/src -v /Users/jeng-yuantsai/cache/UAV-Digital-Twin/docker:/docker tiryoh/ros2:eloquent
