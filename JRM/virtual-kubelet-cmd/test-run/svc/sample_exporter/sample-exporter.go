package main

import (
	"flag"
	"math/rand"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	randomNumber = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "random_number",
		Help: "Random number",
	})
	port = flag.String("port", "2112", "The port to listen on")
)

func init() {
	prometheus.MustRegister(randomNumber)
}

func recordMetrics() {
	go func() {
		for {
			randomNumber.Set(rand.Float64())
			time.Sleep(2 * time.Second)
		}
	}()
}

func main() {
	flag.Parse()
	recordMetrics()

	http.Handle("/metrics", promhttp.Handler())
	http.ListenAndServe(":"+*port, nil)
}