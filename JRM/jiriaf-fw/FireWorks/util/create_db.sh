#!/bin/bash

export HOST_HOME="/home/jeng-yuantsai"

# Create database and create db ""
docker run -d -p 27017:27017 --name jiriaf_test_platform_db -v $HOST_HOME/JIRIAF/mongodb/data:/data/db mongo:latest

# Wait for MongoDB to start
echo "Waiting for MongoDB to start"
sleep 10

# Create a new user
echo "Creating a new user"
docker exec -it mongodb mongosh --eval 'db.getSiblingDB("jiriaf").createUser({user: "jiriaf", pwd: "jiriaf", roles: [{role: "readWrite", db: "jiriaf"}]})'