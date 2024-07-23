#!/bin/bash

mkdir -p ~/digitaltwin_ws/src
cd ~/digitaltwin_ws/src

cp -r /workspaces/jiriaf-0.1/digital-twin-experiment/UAV-Digital-Twin/src/* .

cd ~/digitaltwin_ws/src
cd ../
colcon build
