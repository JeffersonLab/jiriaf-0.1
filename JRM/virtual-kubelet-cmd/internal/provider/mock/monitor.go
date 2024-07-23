package mock

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"syscall"
	"time"
	dto "github.com/prometheus/client_model/go"
	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/mem"
	"github.com/shirou/gopsutil/process"
	"github.com/virtual-kubelet/virtual-kubelet/log"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (p *MockProvider) generateNodeMetrics(ctx context.Context, metricsMap map[string][]*dto.Metric, resourceType string, label []*dto.LabelPair) map[string][]*dto.Metric {
	const (
		cpuMetricSuffix    = "_cpu_usage_seconds_total" // the rate of change of this metric is the cpu usage
		memoryMetricSuffix = "_memory_working_set_bytes"
	)

	// Initialize CPU and memory values
	cpuValue, memoryValue := 0.0, 0.0

	// Get node stats
	userTime, systemTime, _, usedMemory, err := getNodeStats()
	if err != nil {
		log.G(ctx).WithFields(log.Fields{"message": "Error getting user, system, total CPU time, and used memory", "error": err}).Error("Node status")
	} else {
		// Update CPU and memory values
		cpuValue = userTime + systemTime
		memoryValue = float64(usedMemory)
	}

	// Initialize metrics map if nil
	if metricsMap == nil {
		metricsMap = map[string][]*dto.Metric{}
	}

	// Generate metric names
	finalCpuMetricName := resourceType + cpuMetricSuffix
	finalMemoryMetricName := resourceType + memoryMetricSuffix

	// Create new CPU and memory metrics
	newCPUMetric := &dto.Metric{
		Label: label,
		Counter: &dto.Counter{
			Value: &cpuValue,
		},
	}
	newMemoryMetric := &dto.Metric{
		Label: label,
		Gauge: &dto.Gauge{
			Value: &memoryValue,
		},
	}

	// Add new metrics to metrics map
	metricsMap = addMetricToMap(metricsMap, finalCpuMetricName, newCPUMetric)
	metricsMap = addMetricToMap(metricsMap, finalMemoryMetricName, newMemoryMetric)

	return metricsMap
}

func (p *MockProvider) generatePodMetrics(ctx context.Context, pod *v1.Pod, metricsMap map[string][]*dto.Metric, resourceType string, label []*dto.LabelPair) (map[string][]*dto.Metric, map[string]int) {
	const (
		cpuMetricSuffix    = "_cpu_usage_seconds_total" // the rate of change of this metric is the cpu usage
		memoryMetricSuffix = "_memory_working_set_bytes"
	)

	// Initialize CPU and memory values
	cpuValue, memoryValue := 0.0, 0.0

	// Get process group IDs from pod
	pgids, pgidMap, err := getPgidsFromPod(pod)
	if err != nil {
		log.G(ctx).WithFields(log.Fields{"pod": pod.Name, "namespace": pod.Namespace, "message": "Error getting pgids", "error": err}).Error("Pod status")
		return nil, nil
	}

	// Update label by adding the pgidMap
	// pgidMapStr := fmt.Sprintf("%v", pgidMap)
	// pgidLabelKey := "pgidMap"
	// label = append(label, &dto.LabelPair{
	// 	Name:  &pgidLabelKey,
	// 	Value: &pgidMapStr,
	// })

	// Get process metrics for each process group ID
	for _, pgid := range pgids {
		userTime, systemTime, rss, _, err := getProcessesMetrics(pgid)
		if err != nil {
			log.G(ctx).WithFields(log.Fields{"pod": pod.Name, "namespace": pod.Namespace, "pgid": pgid, "message": "Error getting user, system CPU time, and memory usage", "error": err}).Error("Pod status")
			continue
		}

		// Update CPU and memory values
		cpuValue += userTime + systemTime
		memoryValue += rss
	}

	log.G(context.Background()).WithFields(log.Fields{"pod": pod.Name, "cpuValue": fmt.Sprintf("%.2f", cpuValue), "memoryValue": fmt.Sprintf("%.2f", memoryValue), "memoryValueMB": fmt.Sprintf("%.2f", memoryValue/1024/1024)}).Info("Pod status")

	// Initialize metrics map if nil
	if metricsMap == nil {
		metricsMap = map[string][]*dto.Metric{}
	}

	// Generate metric names
	finalCpuMetricName := resourceType + cpuMetricSuffix
	finalMemoryMetricName := resourceType + memoryMetricSuffix

	// Create new CPU and memory metrics
	newCPUMetric := &dto.Metric{
		Label: label,
		Counter: &dto.Counter{
			Value: &cpuValue,
		},
	}
	newMemoryMetric := &dto.Metric{
		Label: label,
		Gauge: &dto.Gauge{
			Value: &memoryValue,
		},
	}

	// Add new metrics to metrics map
	metricsMap = addMetricToMap(metricsMap, finalCpuMetricName, newCPUMetric)
	metricsMap = addMetricToMap(metricsMap, finalMemoryMetricName, newMemoryMetric)

	return metricsMap, pgidMap
}

func (p *MockProvider) generateContainerMetrics(ctx context.Context, c *v1.Container, metricsMap map[string][]*dto.Metric, resourceType string, label []*dto.LabelPair, pgidFile string) map[string][]*dto.Metric {
	const (
		cpuMetricSuffix    = "_cpu_usage_seconds_total" // the rate of change of this metric is the cpu usage
		memoryMetricSuffix = "_memory_working_set_bytes"
	)

	// Initialize CPU and memory values to a small value to avoid division by zero
	cpuValue, memoryValue := 0.0000001, 0.0000001

	// Get process group ID from container
	pgid, err := getPgidFromPgidFile(pgidFile)
	if err != nil {
		log.G(ctx).WithFields(log.Fields{"container": c.Name, "pgidFile": pgidFile, "message": "Error getting pgid", "error": err}).Error("Container status")
		return nil
	}

	// Get process metrics
	userTime, systemTime, rss, _, err := getProcessesMetrics(pgid)
	if err != nil {
		log.G(ctx).WithFields(log.Fields{"container": c.Name, "pgid": pgid, "message": "Error getting user, system CPU time, and memory usage", "error": err}).Error("Container status")
		return nil
	}

	// Update CPU and memory values
	cpuValue = userTime + systemTime + cpuValue
	memoryValue = rss + memoryValue

	log.G(ctx).WithFields(log.Fields{"container": c.Name, "cpuValue": fmt.Sprintf("%.2f", cpuValue), "memoryValue": fmt.Sprintf("%.2f", memoryValue), "memoryValueMB": fmt.Sprintf("%.2f", memoryValue/1024/1024)}).Info("Container status")

	// Initialize metrics map if nil
	if metricsMap == nil {
		metricsMap = map[string][]*dto.Metric{}
	}

	// Generate metric names
	finalCpuMetricName := resourceType + cpuMetricSuffix
	finalMemoryMetricName := resourceType + memoryMetricSuffix

	// Create new CPU and memory metrics
	newCPUMetric := &dto.Metric{
		Label: label,
		Counter: &dto.Counter{
			Value: &cpuValue,
		},
	}
	newMemoryMetric := &dto.Metric{
		Label: label,
		Gauge: &dto.Gauge{
			Value: &memoryValue,
		},
	}

	// Add new metrics to metrics map
	metricsMap = addMetricToMap(metricsMap, finalCpuMetricName, newCPUMetric)
	metricsMap = addMetricToMap(metricsMap, finalMemoryMetricName, newMemoryMetric)

	return metricsMap
}

// addMetricToMap adds a new metric to the metrics map.
func addMetricToMap(metricsMap map[string][]*dto.Metric, metricName string, newMetric *dto.Metric) map[string][]*dto.Metric {
	if existingMetrics, ok := metricsMap[metricName]; ok {
		metricsMap[metricName] = append(existingMetrics, newMetric)
	} else {
		// log.G(context.Background()).Errorf("Metrics not found: %v\n", metricName)
		metricsMap[metricName] = []*dto.Metric{newMetric}
	}
	return metricsMap
}

// getNodeStats calculates and returns the total user time, total system time, total CPU time, and used memory for the node.
func getNodeStats() (totalUserTime float64, totalSystemTime float64, totalCPUTime float64, usedMemory uint64, err error) {
	// Get the CPU times
	cpuTimes, err := cpu.Times(false)
	if err != nil {
		return
	}

	// Iterate over each CPU time and accumulate the user time, system time, and total CPU time
	for _, ct := range cpuTimes {
		totalUserTime += ct.User
		totalSystemTime += ct.System
		totalCPUTime += ct.Total()
	}

	// Get the virtual memory information
	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return
	}

	// Get the used memory
	usedMemory = memInfo.Used

	return
}

// getProcessesMetrics calculates and returns the total user time, total system time, total RSS, and total VMS for all processes in a process group.
func getProcessesMetrics(pgid int) (totalUserTime float64, totalSystemTime float64, totalRSS float64, totalVMS float64, err error) {
	// Get the list of all process IDs
	pids, err := process.Pids()
	if err != nil {
		return
	}

	// Iterate over each process ID
	for _, pid := range pids {
		// Create a new Process instance
		p, err := process.NewProcess(pid)
		if err != nil {
			continue
		}

		// Get the process group ID of the process
		processPgid, err := syscall.Getpgid(int(pid))
		if err != nil {
			continue
		}

		// Get parent process ID
		ppid, err := getParentPid(int(pid))
		if err != nil {
			continue
		}

		// Get the process group ID (pgid) of the parent process
		parentProcessPgid, err := syscall.Getpgid(ppid)
		if err != nil {
			continue
		}

		// Skip the process if it's not in the target process group
		if processPgid != pgid && parentProcessPgid != pgid {
			continue
		}
		
		// Accumulate the CPU times
		if cpuTimes, err := p.Times(); err == nil {
			totalUserTime += cpuTimes.User
			totalSystemTime += cpuTimes.System
		}

		// Accumulate the memory information
		if memInfo, err := p.MemoryInfo(); err == nil {
			totalRSS += float64(memInfo.RSS)
			totalVMS += float64(memInfo.VMS)
		}
	}
	return
}

// getPgidFromPgidFile retrieves the process group ID (pgid) from a file.
func getPgidFromPgidFile(pgidFilePath string) (int, error) {
	// Open the pgid file
	file, err := os.Open(pgidFilePath)
	if err != nil {
		log.G(context.Background()).WithFields(log.Fields{"pgidFilePath": pgidFilePath, "message": "Failed to open pgid file", "error": err}).Error("Container status")
		return 0, err
	}
	defer file.Close()

	// Create a new scanner to read the file
	scanner := bufio.NewScanner(file)
	scanner.Scan()

	// Get the pgid as a string
	pgidString := scanner.Text()

	// Convert the pgid string to an integer
	pgid, err := strconv.Atoi(pgidString)
	if err != nil {
		log.G(context.Background()).WithFields(log.Fields{"pgidFilePath": pgidFilePath, "pgidString": pgidString, "message": "Failed to convert pgid to integer", "error": err}).Error("Container status")
		return 0, err
	}

	// Log the pgid
	log.G(context.Background()).WithFields(log.Fields{"pgidFilePath": pgidFilePath, "pgid": pgid}).Info("Container status")

	return pgid, nil
}

// getPgidsFromPod retrieves the process group IDs (pgids) from a pod.
func getPgidsFromPod(pod *v1.Pod) ([]int, map[string]int, error) {
	var pgids []int
	pgidMap := make(map[string]int)

	// Iterate over each container in the pod
	for _, container := range pod.Spec.Containers {
		// Construct the path to the pgid file
		pgidFile := path.Join(os.Getenv("HOME"), pod.Namespace, pod.Name, "containers", container.Name, "pgid")

		// Read the pgid from the file
		pgid, err := readPgidFromFile(pgidFile)
		if err != nil {
			log.G(context.Background()).WithFields(log.Fields{"container": container.Name, "pgidFile": pgidFile, "message": "Error reading pgid from file", "error": err}).Error("Container status")
			return nil, nil, err
		}

		// Add the pgid to the list and map
		pgids = appendUnique(pgids, pgid)
		pgidMap[container.Name] = pgid
	}

	return pgids, pgidMap, nil
}

func (*MockProvider) createPodStatusFromContainerStatus(ctx context.Context, pod *v1.Pod) *v1.Pod {
	containerStatuses := make([]v1.ContainerStatus, len(pod.Spec.Containers))
	prevContainerStartTime := make(map[string]metav1.Time)
	prevContainerFinishTime := make(map[string]metav1.Time)
	prevContainerTerminateExitCode := make(map[string]int32)
	prevContainerTerminatedReason := make(map[string]string)
	prevContainerTerminatedMessage := make(map[string]string)
	prevContainerStateString := make(map[string]string)
	imageIDs := make(map[string]string)
	pgids := make(map[string]string)

	prevPodStartTime := pod.Status.StartTime

	for i, container := range pod.Spec.Containers {
		for _, containerStatus := range pod.Status.ContainerStatuses {
			if containerStatus.Name != container.Name {
				continue
			}

			imageIDs[container.Name] = containerStatus.ImageID
			pgids[container.Name] = containerStatus.ContainerID

			if containerStatus.State.Running != nil {
				prevContainerStateString[container.Name] = "Running"
				prevContainerStartTime[container.Name] = containerStatus.State.Running.StartedAt
				prevContainerFinishTime[container.Name] = metav1.NewTime(time.Now())
			} else if containerStatus.State.Terminated != nil {
				prevContainerStateString[container.Name] = "Terminated"
				prevContainerStartTime[container.Name] = containerStatus.State.Terminated.StartedAt
				prevContainerFinishTime[container.Name] = containerStatus.State.Terminated.FinishedAt
				prevContainerTerminatedReason[container.Name] = containerStatus.State.Terminated.Reason
				prevContainerTerminatedMessage[container.Name] = containerStatus.State.Terminated.Message
				prevContainerTerminateExitCode[container.Name] = containerStatus.State.Terminated.ExitCode
			} else {
				prevContainerStateString[container.Name] = "Waiting"
				prevContainerStartTime[container.Name] = metav1.NewTime(time.Now())
				prevContainerFinishTime[container.Name] = metav1.NewTime(time.Now())
			}

			pgidFile := path.Join(os.Getenv("HOME"), pod.Namespace, pod.Name, "containers", container.Name, "pgid")
			containerStatuses[i] = *createContainerStatusFromProcessStatus(&container, prevContainerStateString, prevContainerStartTime, prevContainerFinishTime, pgidFile, imageIDs, prevContainerTerminatedReason, prevContainerTerminatedMessage, pgids, prevContainerTerminateExitCode)
			break
		}
	}

	// areAllTerminated, stderrNotEmpty, getPgidError, getPidsError, getStderrFileInfoError, containerStartError := checkTerminatedContainer(pod)
	areAllTerminated, areAllExitCodeZero := checkTerminatedContainer(pod)
	podReady := v1.ConditionTrue
	if areAllTerminated {
		log.G(context.Background()).WithFields(log.Fields{"pod": pod.Name, "namespace": pod.Namespace, "message": "All processes are zombies."}).Info("Pod status")
		// if stderrNotEmpty || containerStartError || getPgidError || getPidsError || getStderrFileInfoError {
		// 	pod.Status.Phase = v1.PodFailed
		if !areAllExitCodeZero {
			pod.ObjectMeta.DeletionTimestamp = &metav1.Time{Time: time.Now()}
			pod.Status.Phase = v1.PodFailed
			podReady = v1.ConditionFalse
		} else {
			// update pod spec objectMeta DeletionTimestamp
			pod.ObjectMeta.DeletionTimestamp = &metav1.Time{Time: time.Now()}

			pod.Status.Phase = v1.PodSucceeded
			podReady = v1.ConditionFalse
		}
	} else {
		pod.Status.Phase = v1.PodRunning
		podReady = v1.ConditionTrue

	}

	pod.Status = v1.PodStatus{
		StartTime:      prevPodStartTime,
		Phase:             pod.Status.Phase,
		PodIP: 		   os.Getenv("VKUBELET_POD_IP"),
		// HostIP: 		  os.Getenv("VKUBELET_POD_IP"),
		Conditions:       []v1.PodCondition{
			{
				Type:   v1.PodScheduled,
				Status: v1.ConditionTrue,
				LastTransitionTime: *prevPodStartTime,
			},
			{
				Type:   v1.PodInitialized,
				Status: v1.ConditionTrue,
				LastTransitionTime: *prevPodStartTime,
			},
			{
				Type:   v1.PodReady,
				Status: podReady,
				LastTransitionTime: prevContainerStartTime[pod.Spec.Containers[0].Name],
			},
		},
		ContainerStatuses: containerStatuses,
	}
	return pod
}

// createContainerStatusFromProcessStatus creates a container status from process status.
func createContainerStatusFromProcessStatus(c *v1.Container, prevContainerStateString map[string]string, prevContainerStartTime map[string]metav1.Time, prevContainerFinishTime map[string]metav1.Time, pgidFile string, imageIDs map[string]string, prevContainerTerminatedReason map[string]string, prevContainerTerminatedMessage map[string]string, pgids map[string]string, prevContainerTerminateExitCode map[string]int32) *v1.ContainerStatus {
	//if prevContainerReason and prevContainerMessage are not empty, then pass them to the container status
	if prevContainerTerminateExitCode[c.Name] == 1 {
		containerState := &v1.ContainerState{
			Terminated: &v1.ContainerStateTerminated{
				StartedAt:  prevContainerStartTime[c.Name],
				FinishedAt: prevContainerFinishTime[c.Name],
				ExitCode:   1,
				Reason:     prevContainerTerminatedReason[c.Name],
				Message:    prevContainerTerminatedMessage[c.Name],
			},
		}
		return createContainerStatus(c, containerState, pgids[c.Name], imageIDs[c.Name])
	}

	// Get the process IDs (pids)
	pids, err := process.Pids()
	if err != nil {
		log.G(context.Background()).WithFields(log.Fields{"container": c.Name, "pgidFile": pgidFile, "message": "Error getting pids", "error": err}).Error("Container status")
		containerState := &v1.ContainerState{
			Terminated: &v1.ContainerStateTerminated{
				StartedAt:  prevContainerStartTime[c.Name],
				FinishedAt: prevContainerFinishTime[c.Name],
				ExitCode:   2,
				Reason:     "getPidsError",
				Message:    "Error getting pids",
			},
		}
		return createContainerStatus(c, containerState, pgids[c.Name], imageIDs[c.Name])
	}

	// Check the stderr file for errors
	stderrFilePath := path.Join(filepath.Dir(imageIDs[c.Name]), "stderr")

	// Get the file info
	info, err := os.Stat(stderrFilePath)
	if err != nil {
		log.G(context.Background()).WithFields(log.Fields{"container": c.Name, "stderrFilePath": stderrFilePath, "message": "Error getting stderr file info", "error": err}).Error("Container status")
		containerState := &v1.ContainerState{
			Terminated: &v1.ContainerStateTerminated{
				StartedAt:  prevContainerStartTime[c.Name],
				FinishedAt: prevContainerFinishTime[c.Name],
				ExitCode:   2,
				Reason:     "getStderrFileInfoError",
				Message:    "Error getting stderr file info",
			},
		}
		return createContainerStatus(c, containerState, pgids[c.Name], imageIDs[c.Name])
	}

	// Check if the file is empty
	hasStderr := false
	if info.Size() != 0 {
		log.G(context.Background()).WithFields(log.Fields{"container": c.Name, "stderrFilePath": stderrFilePath, "message": "The stderr file is not empty."}).Error("Container status")
		hasStderr = true
	} else {
		log.G(context.Background()).WithFields(log.Fields{"container": c.Name, "stderrFilePath": stderrFilePath, "message": "The stderr file is empty."}).Info("Container status")
	}

	// Get the process status for each pid
	processStatus := getProcessStatus(pids, pgids[c.Name], c.Name)

	// Determine the container status
	containerStatus := determineContainerStatus(c, processStatus, pgids[c.Name], prevContainerStartTime[c.Name].Time, prevContainerFinishTime[c.Name].Time, prevContainerStateString[c.Name], imageIDs[c.Name], hasStderr)
	return containerStatus
}

func checkTerminatedContainer(pod *v1.Pod) (areAllTerminated bool, areAllExitCodeZero bool) {
	terminatedContainerCounter := 0
	exitCodeCounter := 0
	for _, containerStatus := range pod.Status.ContainerStatuses {
		if containerStatus.State.Terminated != nil {
			terminatedContainerCounter++
			if containerStatus.State.Terminated.ExitCode != 0 {
				exitCodeCounter++
			}
		}
	}
	areAllTerminated = terminatedContainerCounter == len(pod.Status.ContainerStatuses)
	areAllExitCodeZero = exitCodeCounter == 0
	return
}

// getProcessStatus gets the process status for each pid.
func getProcessStatus(pids []int32, pgid string, containerName string) []string {
	var processStatus []string
	// Iterate over each process ID
	for _, pid := range pids {
		// Create a new Process instance
		p, err := process.NewProcess(pid)
		if err != nil {
			continue
		}

		// Get the process group ID of the process
		processPgid, err := syscall.Getpgid(int(pid))
		if err != nil {
			continue
		}

		// Get parent process ID
		ppid, err := getParentPid(int(pid))
		if err != nil {
			continue
		}

		// Get the process group ID (pgid) of the parent process
		parentProcessPgid, err := syscall.Getpgid(ppid)
		if err != nil {
			continue
		}

		// convert pgid to int
		pgid, _ := strconv.Atoi(pgid)

		// Skip the process if it's not in the target process group
		if processPgid != pgid && parentProcessPgid != pgid {
			continue
		}

		cmd, err := p.Cmdline()
		if err != nil {
			log.G(context.Background()).WithFields(log.Fields{"pid": pid, "ppid": ppid, "pgid": processPgid, "parentProcessPgid": parentProcessPgid, "containerID": pgid, "container": containerName, "cmd": cmd}).Error("Process status")
			continue
		}
		status, _ := p.Status()
		processStatus = append(processStatus, status)
		log.G(context.Background()).WithFields(log.Fields{"pid": pid, "ppid": ppid, "pgid": processPgid, "parentProcessPgid": parentProcessPgid, "containerID": pgid, "container": containerName, "cmd": cmd, "status": status}).Info("Process status")
	}
	return processStatus
}

// determineContainerStatus determines the container status.
func determineContainerStatus(c *v1.Container, processStatus []string, pgid string, prevContainerStartTime time.Time, prevContainerFinishTime time.Time, prevContainerStateString string, ImageID string, hasStderr bool) *v1.ContainerStatus {
	var containerStatus *v1.ContainerStatus
	var containerState *v1.ContainerState
	var currentContainerState string
	ctx := context.Background()

	var allZ = true
	for _, status := range processStatus {
		if status != "Z" {
			allZ = false
			break
		}
	}

	if allZ {
		currentContainerState = "Terminated"
	} else {
		currentContainerState = "Running"
	}

	// Log the transition
	log.G(ctx).WithFields(log.Fields{"container": c.Name, "pgid": pgid, "ImageID": ImageID, "prevContainerStateString": prevContainerStateString, "currentContainerState": currentContainerState, "prevContainerStartTime": prevContainerStartTime, "prevContainerFinishTime": prevContainerFinishTime}).Info("Container status")
	if currentContainerState == "Running" {
		containerState = &v1.ContainerState{
			Running: &v1.ContainerStateRunning{
				StartedAt: metav1.NewTime(prevContainerStartTime),
			},
		}
	} else if currentContainerState == "Terminated" {
		var reason string
		var message string
		var exitCode int32
		if hasStderr {
			reason = "stderrNotEmpty"
			message = "The stderr file is not empty."
			exitCode = 3
		} else {
			reason = "Completed"
			message = "All processes are zombies"
			exitCode = 0
		}
		containerState = &v1.ContainerState{
			Terminated: &v1.ContainerStateTerminated{
				StartedAt:  metav1.NewTime(prevContainerStartTime),
				FinishedAt: metav1.NewTime(prevContainerFinishTime),
				ExitCode:   exitCode,
				Reason:     reason,
				Message:    message,
			},
		}
	}

	containerStatus = createContainerStatus(c, containerState, pgid, ImageID)
	return containerStatus
}

// createContainerStatus creates a container state.
func createContainerStatus(c *v1.Container, containerState *v1.ContainerState, pgid string, ImageID string) *v1.ContainerStatus {
	log.G(context.Background()).WithFields(log.Fields{"container": c.Name, "pgid": pgid, "ImageID": ImageID, "containerState": containerState}).Info("Container status")
	ready := false
	if containerState.Running != nil {
		ready = true
	}

	return &v1.ContainerStatus{
		Name:         c.Name,
		State:        *containerState,
		Ready:        ready,
		RestartCount: 0,
		Image:        c.Image,
		ImageID:      ImageID,
		ContainerID:  pgid,
	}
}

// readPgidFromFile reads a pgid from a file.
func readPgidFromFile(filePath string) (int, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Scan()
	pgidString := scanner.Text()

	return strconv.Atoi(pgidString)
}

// appendUnique appends a value to a slice if it's not already in the slice.
func appendUnique(slice []int, value int) []int {
	for _, v := range slice {
		if v == value {
			return slice
		}
	}
	return append(slice, value)
}
