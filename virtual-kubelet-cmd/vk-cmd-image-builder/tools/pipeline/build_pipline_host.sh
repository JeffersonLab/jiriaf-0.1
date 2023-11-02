#!/bin/bash
# run this script on host machine!

# if folder $HOME/hostpip exists, do nothing; otherwise, create it
if [ ! -d "$HOME/hostpipe" ]; then
    mkdir $HOME/hostpipe
fi

# if file $HOME/hostpipe/vk-cmd exists, do nothing; otherwise, create it
if [ ! -p "$HOME/hostpipe/vk-cmd" ]; then
    mkfifo $HOME/hostpipe/vk-cmd

fi

# while true do eval "$(cat $HOME/hostpipe/vk-cmd)" save stderror and stdout to diferent files
while true; do
    eval "$(cat $HOME/hostpipe/vk-cmd)" > $HOME/hostpipe/pipeline.out 2> $HOME/hostpipe/pipeline.err
done
