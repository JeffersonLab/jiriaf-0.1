#!/bin/bash
#SBATCH --partition=ifarm
#SBATCH --account=epsci
#SBATCH --output=slurm-%j.out
#SBATCH --error=slurm-%j.err
#SBATCH --time=00:00:30
#SBATCH --nodes=1
#SBATCH --job-name=test-tsai

# output some useful information and save it to a file in the current directory
touch > a.txt