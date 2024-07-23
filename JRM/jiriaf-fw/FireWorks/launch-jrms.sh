#!/bin/bash

# Define a function to display help
function display_help {
    echo "Usage: ./main.sh [command]"
    echo "Commands:"
    echo "  add_wf       Add a workflow to the launchpad. Requires environment variables to be set."
    echo "  get_wf       Get workflows from the launchpad"
    echo "  delete_wf    Delete workflows from the launchpad. Requires an additional argument for the workflow id."
    exit 0
}

# Define a function to handle invalid arguments
function handle_invalid_arg {
    echo "Invalid argument. Please use add_wf, get_wf, or delete_wf."
    display_help
    exit 1
}

# Check if no arguments were provided or if help was requested
if [ -z "$1" ] || [ "$1" == "help" ] || [ "$1" == "-h" ]; then
    display_help
fi

# Handle the provided argument
case "$1" in
    add_wf)
        /fw/create_config.sh || { echo "/fw/create_config.sh failed"; exit 1; }
        python /fw/gen_wf.py add_wf
        ;;
    get_wf)
        lpad -l /fw/util/my_launchpad.yaml get_wflows -t 
        ;;
    delete_wf)
        python /fw/gen_wf.py delete_wf --fw_id $2
        ;;
    *)
        handle_invalid_arg
        ;;
esac