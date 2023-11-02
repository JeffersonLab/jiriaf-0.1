#! /bin/bash
# This file creates a certificate and key for the client, which could be a fake one for running VK. 
# Info for loging in APISERVER is stored in ~/.kube/config, which is a true file.

# openssl has to be installed on the system

openssl genres -out client.key 2048
openssl req -new -key client.key -subj "/CN=admin" -out client.csr
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -days 36500
