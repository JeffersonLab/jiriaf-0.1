#!/bin/bash

# docker run -it -d -v /home/jeng-yuantsai/JIRIAF/UAV-Digital-Twin/src:/digitaltwin/src tiryoh/ros2:eloquent
docker run -it -e DISPLAY=":10.0" -v /tmp/.X11-unix:/tmp/.X11-unix -v /home/jeng-yuantsai/JIRIAF/UAV-Digital-Twin/src:/digitaltwin/src -v /home/jeng-yuantsai/JIRIAF/UAV-Digital-Twin/docker:/docker tiryoh/ros2:eloquent

