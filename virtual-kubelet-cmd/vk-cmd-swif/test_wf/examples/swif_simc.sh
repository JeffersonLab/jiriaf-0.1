#/bin/bash
cd /group/c-csv/shuo/shuo_analysis/simc
swif2 cancel csv_simc -delete
swif2 import -file csv_simc.json
swif2 run csv_simc
