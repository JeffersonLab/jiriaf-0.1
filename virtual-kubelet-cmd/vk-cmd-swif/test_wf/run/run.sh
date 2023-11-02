#!/bin/bash

source ../../cmds_swif.sh

genwf test.json
runwf test-swif
statwf test-swif 5