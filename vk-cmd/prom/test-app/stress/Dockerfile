# jlabtsai/read-resources:latest

# Use lightweight linux image
FROM alpine:3.12

#install stress
RUN apk add stress-ng

COPY stress.sh /stress.sh

RUN chmod +x /stress.sh

# Run stress.sh when the container launches
ENTRYPOINT ["/stress.sh"]

