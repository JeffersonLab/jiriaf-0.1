#!/bin/bash


# run ros2
cd ~/digitaltwin_ws
. install/setup.bash
ros2 launch digitaltwin digitaltwin_launch_gui_logger.py > /workspaces/jiriaf-0.1/digital-twin-experiment/UAV-Digital-Twin/log.txt 2>&1

# ros2 launch digitaltwin digitaltwin_launch_gui_logger.py

#digitaltwin_launch_gui_logger.py