# generate a docker file that run lightweight ubuntu

FROM docker://ubuntu:18.04
# bind "$HOME/hostpip" in host to "/hostpipe" in container 
# so that we can share files between host and container
VOLUME /hostpipe

# how to bind /hostpipe to ~/pipline
    # 1. docker run -it -v $HOME/hostpipe:/hostpipe IMAGE_NAME bash
    # 2. In container, ls /hostpipe to see if vk-cmd is there.
    # 3. In container, run: echo "ls -l ." > /hostpipe/vk-cmd ; this will run commands on the host.