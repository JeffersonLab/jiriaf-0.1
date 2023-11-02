#!/bin/bash

# This script is used to generate random numbers simultaneously
echo "Generating random numbers"

# function 1: generate a random number and sleep for 100s
function gen_random1() {
    while true
    do
        echo $((RANDOM%100))
        sleep 100
    done
}

# function 2: generate a random number and sleep for 200s
function gen_random2() {
    while true
    do
        echo $((RANDOM%100))
        sleep 200
    done
}


gen_random1 & gen_random2
