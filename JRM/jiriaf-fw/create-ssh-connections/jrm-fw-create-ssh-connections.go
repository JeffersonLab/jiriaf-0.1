package main

import (
    "fmt"
    "net"
    "net/http"
    "os/exec"
    "strconv"
    "github.com/gorilla/mux"
)

func getAvailablePort(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    ip := vars["ip"]
    start, _ := strconv.Atoi(vars["start"])
    end, _ := strconv.Atoi(vars["end"])

    for port := start; port <= end; port++ {
        address := fmt.Sprintf("%s:%d", ip, port)
        listener, err := net.Listen("tcp", address)
        if err == nil {
            listener.Close()
            fmt.Fprintf(w, `{"port": %d}`, port)
            return
        }
    }
    fmt.Fprintf(w, `{"error": "No available port found"}`)
}

func runCommand(w http.ResponseWriter, r *http.Request) {
    command := r.FormValue("command")
    cmd := exec.Command("bash", "-c", command)

    // Start the command and don't wait for it to finish
    err := cmd.Start()
    if err != nil {
        fmt.Fprintf(w, `{"error": "%s"}`, err)
        return
    }

    // Send a response immediately
    fmt.Fprintf(w, `{"status": "Command started"}`)
}

func main() {
    r := mux.NewRouter()
    r.HandleFunc("/get_port/{ip}/{start:[0-9]+}/{end:[0-9]+}", getAvailablePort).Methods("GET")
    r.HandleFunc("/run", runCommand).Methods("POST")
    http.ListenAndServe(":8888", r)
}