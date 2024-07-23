package main

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"net"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "Hello, World!")
	// run some CPU-bound work
	// for i := 0; i < 100000000; i++ {
	// 	_ = i
	// }
}

func main() {
	http.HandleFunc("/", helloHandler)

	listener, err := net.Listen("tcp", "localhost:0") 
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to listen: %v\n", err)
		os.Exit(1)
	}

	serverURL := url.URL{
		Scheme: "http",
		Host:   listener.Addr().String(),
	}

	go func() {
		_, err = http.Get("http://localhost:8080/register?url=" + url.QueryEscape(serverURL.String()))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to register with load balancer: %v\n", err)
			os.Exit(1)
		}
	}()

	fmt.Printf("Server is listening on %s\n", listener.Addr().String())
	http.Serve(listener, nil)
}