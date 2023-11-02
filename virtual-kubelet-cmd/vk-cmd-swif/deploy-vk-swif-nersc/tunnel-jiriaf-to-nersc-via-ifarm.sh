#/bin/bash

#make sure these connections work. This script should be run at ifarm.


## s: jiriaf2301, c: ifarm
ssh -NfL 12345:localhost:42053 jiriaf2301

## s: ifarm, c: perlmutter
ssh -NfR 42053:localhost:12345 perlmutter


## TEST: using gateway ifarm to connect to perlmutter from jiriaf2301
### Run this at jiriaf2301
# ssh -J ifarm -NfR 42053:localhost:42053 perlmutter

## Perlmutter s: login, c: compute; run this at compute by specifing this line at command script for swif2.
### ssh -NfL 42053:localhost:42053 login01
