#create ubuntu image as base and generate random numbers
FROM ubuntu:latest

#copy gen-random.sh to /gen-random.sh

COPY gen-random.sh /gen-random.sh

#run gen-random.sh when container launches
RUN chmod +x /gen-random.sh

ENTRYPOINT ["/gen-random.sh"]

