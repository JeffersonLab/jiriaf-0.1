# UNIX pipe between Container and Host

This guide explains how to build a UNIX pipe between a container and the host, which allows you to run commands on the host from the container.

1. Execute `build_pipeline.sh` in the background to build the pipeline at `$HOME/hostpipe/vk-cmd` on the host.
2. Run the container and bind the pipeline using the `-v` option. For example: `docker run -v $HOME/hostpipe:/path/to/hostpipe <image-name>`. Note that this step may not be required if `$HOME/hostpipe` is already accessible in the container.
3. Run commands on the host from the container by using the pipeline. For example: `echo "shell commands" > /path/to/hostpipe/vk-cmd`.
4. The error and output of the `"shell commands"` will be written to `$HOME/hostpipe/pipeline.err` and `$HOME/hostpipe/pipeline.out` on the host.