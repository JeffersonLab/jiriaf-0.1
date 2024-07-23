package main

import (
    "container/list"
    "net/http/httputil"
    "net/http"
    "net/url"
    "net"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"

)

var serverRequests = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "server_requests_total",
        Help: "Total number of requests for each server",
    },
    []string{"server"},
)

var servers *list.List

func helloHandler(w http.ResponseWriter, r *http.Request) {
    for e := servers.Front(); e != nil; e = e.Next() {
        server := e.Value.(*url.URL)

        conn, err := net.Dial("tcp", server.Host)
        if err != nil {
            // remove the server from the list
            next := e.Next()
            servers.Remove(e)
            e = next
            continue
        }

        conn.Close()

        // Increment the counter for this server
        serverRequests.WithLabelValues(server.Host).Inc()

        proxy := httputil.NewSingleHostReverseProxy(server)
        proxy.ServeHTTP(w, r)

        // Move the server to the back of the list
        servers.MoveToBack(e)
        break
    }

    if servers.Len() == 0 {
        http.Error(w, "No servers available", http.StatusInternalServerError)
        return
    }
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
    serverURL, err := url.Parse(r.URL.Query().Get("url"))
    if err != nil {
        http.Error(w, "Invalid server URL", http.StatusBadRequest)
        return
    }

    servers.PushBack(serverURL)
}

func listServersHandler(w http.ResponseWriter, r *http.Request) {
    for e := servers.Front(); e != nil; e = e.Next() {
        server := e.Value.(*url.URL)
        w.Write([]byte(server.String() + "\n"))
    }
}


func main() {
    servers = list.New()
    prometheus.MustRegister(serverRequests)
    http.HandleFunc("/", helloHandler)
    http.HandleFunc("/register", registerHandler)
    http.Handle("/metrics", promhttp.Handler())

    http.HandleFunc("/list", listServersHandler)
    http.ListenAndServe(":8080", nil)
}