package main

import (
    "fmt"
    "net"
    "net/http"
    "os"
    "os/exec"
    "os/signal"
    "strconv"
    "syscall"
    "github.com/gorilla/mux"
    "context"
    "time"
    "bufio"
    "strings"
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

var restartServer bool

func runCommand(w http.ResponseWriter, r *http.Request) {
    command := r.FormValue("command")

    // Create a new context with a timeout
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second) // adjust the timeout value as needed
    defer cancel()

    // Create the command with the context
    cmd := exec.CommandContext(ctx, "bash", "-c", command)

    // Set the process group ID to the command's process ID
    cmd.SysProcAttr = &syscall.SysProcAttr{
        Setpgid: true,
    }

    // Get the stderr pipe
    stderr, err := cmd.StderrPipe()
    if err != nil {
        fmt.Fprintf(w, `{"error": "%s"}`, err)
        return
    }

    // Start the command and don't wait for it to finish
    if err := cmd.Start(); err != nil {
        fmt.Fprintf(w, `{"error": "%s"}`, err)
        return
    }

    // Create a channel to wait for the command to finish
    done := make(chan error, 1)
    go func() {
        done <- cmd.Wait()
    }()

    // Read from the stderr pipe in a separate goroutine
    go func() {
        reader := bufio.NewReader(stderr)
        for {
            line, err := reader.ReadString('\n')
            if err != nil || strings.Contains(line, "Password + OTP: ") {
                // If the specific output is detected or an error occurs, send a SIGINT signal to the command's process
                cmd.Process.Signal(os.Interrupt)
                restartServer = true
                return
            }
            // Print the output
            // fmt.Println(line)
        }
    }()

    // Use a select statement to wait for the command to finish or for the context to timeout
    select {
    case <-ctx.Done():
        if ctx.Err() == context.DeadlineExceeded {
            fmt.Fprintf(w, `{"error": "Command timed out, check your connection"}`)
        }
        if err := cmd.Process.Kill(); err != nil {
            fmt.Fprintf(w, `{"error": "Failed to kill process: %s"}`, err)
        }
    case err := <-done:
        if err != nil {
            fmt.Fprintf(w, `{"error": "%s"}`, err)
        } else {
            fmt.Fprintf(w, `{"status": "Command completed"}`)
        }
    }
}

func main() {
    r := mux.NewRouter()
    r.HandleFunc("/get_port/{ip}/{start:[0-9]+}/{end:[0-9]+}", getAvailablePort).Methods("GET")
    r.HandleFunc("/run", runCommand).Methods("POST")

    // Create a channel to receive OS signals
    c := make(chan os.Signal, 1)
    // Notify the channel for SIGINT signals
    signal.Notify(c, os.Interrupt, syscall.SIGTERM)

    for {
        restartServer = true

        // Run a goroutine that waits for the SIGINT signal
        go func() {
            sig := <-c
            fmt.Println("\nReceived an interrupt, stopping services...")
            if sig == os.Interrupt {
                fmt.Println("Terminating program due to keyboard interrupt...")
                os.Exit(0)
            } else if restartServer {
                fmt.Println("Restarting server...")
            }
        }()

        http.ListenAndServe(":8888", r)

        if !restartServer {
            break
        }
    }
}