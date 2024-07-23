#!/bin/bash

mkdir -p ~/digitaltwin_ws/src
cd ~/digitaltwin_ws/src

cp -r /workspaces/UAV-Digital-Twin/src/* .

cd ~/digitaltwin_ws/src
cd ../
colcon build
