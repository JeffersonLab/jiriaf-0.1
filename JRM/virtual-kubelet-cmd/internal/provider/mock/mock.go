package mock

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"path"
	"strings"
	"time"

	"runtime"

	dto "github.com/prometheus/client_model/go"
	"github.com/virtual-kubelet-cmd/internal/manager"
	"github.com/virtual-kubelet/virtual-kubelet/errdefs"

	"github.com/virtual-kubelet/virtual-kubelet/log"
	// vklogv2 "github.com/virtual-kubelet/virtual-kubelet/log/klogv2"

	// "github.com/virtual-kubelet-cmd/internal/provider/kubernetes"
	"syscall"

	"github.com/shirou/gopsutil/process"
	"github.com/virtual-kubelet/virtual-kubelet/node/api"
	stats "github.com/virtual-kubelet/virtual-kubelet/node/api/statsv1alpha1"
	"github.com/virtual-kubelet/virtual-kubelet/trace"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	// "github.com/pkg/errors"
	"os"
	"strconv"
	"os/user"
	"sync"
	"io/ioutil"
)

const (
	// Provider configuration defaults.
	defaultCPUCapacity    = "20"
	defaultMemoryCapacity = "100Gi"
	defaultPodCapacity    = "20"

	// Values used in tracing as attribute keys.
	namespaceKey     = "namespace"
	nameKey          = "name"
	containerNameKey = "containerName"
)

// See: https://github.com/virtual-kubelet-cmd/issues/632
/*
var (
	_ providers.Provider           = (*MockV0Provider)(nil)
	_ providers.PodMetricsProvider = (*MockV0Provider)(nil)
	_ node.PodNotifier         = (*MockProvider)(nil)
)
*/

// MockProvider implements the virtual-kubelet provider interface and stores pods in memory.
type MockProvider struct { //nolint:golint
	nodeName           string
	operatingSystem    string
	internalIP         string
	daemonEndpointPort int32
	pods               map[string]*v1.Pod
	config             MockConfig
	startTime          time.Time
	notifier           func(*v1.Pod)
	rm                 *manager.ResourceManager
}

// MockConfig contains a mock virtual-kubelet's configurable parameters.
type MockConfig struct { //nolint:golint
	CPU        string            `json:"cpu,omitempty"`
	Memory     string            `json:"memory,omitempty"`
	Pods       string            `json:"pods,omitempty"`
	Others     map[string]string `json:"others,omitempty"`
	ProviderID string            `json:"providerID,omitempty"`
}

// NewMockProviderMockConfig creates a new MockV0Provider. Mock legacy provider does not implement the new asynchronous podnotifier interface
func NewMockProviderMockConfig(config MockConfig, nodeName, operatingSystem string, internalIP string, daemonEndpointPort int32, rm *manager.ResourceManager) (*MockProvider, error) {
	// set defaults
	if config.CPU == "" {
		config.CPU = defaultCPUCapacity
	}
	if config.Memory == "" {
		config.Memory = defaultMemoryCapacity
	}
	if config.Pods == "" {
		config.Pods = defaultPodCapacity
	}

	provider := MockProvider{
		nodeName:           nodeName,
		operatingSystem:    operatingSystem,
		internalIP:         internalIP,
		daemonEndpointPort: daemonEndpointPort,
		pods:               make(map[string]*v1.Pod),
		config:             config,
		startTime:          time.Now(),
		rm:                 rm,
	}

	return &provider, nil
}

// NewMockProvider creates a new MockProvider, which implements the PodNotifier interface
func NewMockProvider(providerConfig, nodeName, operatingSystem string, internalIP string, daemonEndpointPort int32, rm *manager.ResourceManager) (*MockProvider, error) {
	config, err := loadConfig(providerConfig, nodeName)
	if err != nil {
		return nil, err
	}

	return NewMockProviderMockConfig(config, nodeName, operatingSystem, internalIP, daemonEndpointPort, rm)
}

// loadConfig loads the given json configuration files.
func loadConfig(providerConfig, nodeName string) (config MockConfig, err error) {
	// if no config file is provided, set up a new config with default values
	//cpu: defaultCPUCapacity, memory: defaultMemoryCapacity, pods: defaultPodCapacity
	if providerConfig == "" {
		log.G(context.Background()).WithFields(log.Fields{"providerConfig": providerConfig, "nodeName": nodeName, "message": "No provider config file provided, using default values"}).Info("Node status")
		cpu := int64(runtime.NumCPU())
		mem := int64(getSystemTotalMemory())
		pods := int64(1000)
		config.CPU = fmt.Sprintf("%d", cpu)
		config.Memory = fmt.Sprintf("%d", mem)
		config.Pods = fmt.Sprintf("%d", pods)
		log.G(context.Background()).WithFields(log.Fields{"cpu": config.CPU, "memory": config.Memory, "pods": config.Pods}).Info("Node status")
		return config, nil
	}

	data, err := os.ReadFile(providerConfig)
	if err != nil {
		return config, err
	}
	configMap := map[string]MockConfig{}
	err = json.Unmarshal(data, &configMap)
	if err != nil {
		return config, err
	}
	if _, exist := configMap[nodeName]; exist {
		config = configMap[nodeName]
		if config.CPU == "" {
			config.CPU = defaultCPUCapacity
		}
		if config.Memory == "" {
			config.Memory = defaultMemoryCapacity
		}
		if config.Pods == "" {
			config.Pods = defaultPodCapacity
		}
	}

	if _, err = resource.ParseQuantity(config.CPU); err != nil {
		return config, fmt.Errorf("invalid CPU value %v", config.CPU)
	}
	if _, err = resource.ParseQuantity(config.Memory); err != nil {
		return config, fmt.Errorf("invalid memory value %v", config.Memory)
	}
	if _, err = resource.ParseQuantity(config.Pods); err != nil {
		return config, fmt.Errorf("invalid pods value %v", config.Pods)
	}
	for _, v := range config.Others {
		if _, err = resource.ParseQuantity(v); err != nil {
			return config, fmt.Errorf("invalid others value %v", v)
		}
	}
	return config, nil
}

// CreatePod accepts a Pod definition and stores it in memory.
func (p *MockProvider) CreatePod(ctx context.Context, pod *v1.Pod) error {
	// Start a new span for tracing
	ctx, span := trace.StartSpan(ctx, "CreatePod")
	defer span.End()

	// Add the pod's coordinates to the current span.
	ctx = addAttributes(ctx, span, namespaceKey, pod.Namespace, nameKey, pod.Name)

	log.G(ctx).WithFields(log.Fields{"pod": pod.Name, "namespace": pod.Namespace, "message": "Received CreatePod"}).Info("Pod status")

	// Build key for pod
	key, err := buildKey(pod)
	if err != nil {
		return err
	}

	// Store pod in memory
	p.pods[key] = pod

	// Set start time for pod
	startTime := metav1.NewTime(time.Now())

	// Process pod volumes
	volumes, err := p.volumes(ctx, pod, volumeAll)
	if err != nil {
		log.G(ctx).WithFields(log.Fields{"err": err, "pod": pod.Name, "namespace": pod.Namespace, "message": "Failed to process volumes"}).Error("Pod status")
		return err
	}

	// Create a dir to store the pgid of each container at $HOME/.pgid
	// pgidDir := path.Join(os.Getenv("HOME"), ".pgid")
	// if _, err := os.Stat(pgidDir); os.IsNotExist(err) {
	// 	err := os.Mkdir(pgidDir, 0700)
	// 	if err != nil {
	// 		log.G(ctx).WithField("err", err).Error("Failed to create pgid dir")
	// 		return err
	// 	}
	// }

	// Run scripts in parallel and collect container statuses and errors
	_, containerStatusChan := p.runScriptParallel(ctx, pod, volumes)
	for containerStatus := range containerStatusChan {
		pod.Status.ContainerStatuses = append(pod.Status.ContainerStatuses, containerStatus)
	}

	// Check if all containers have terminated and exit with error, if yes, set pod status to failed
	badContainers := 0
	for _, containerStatus := range pod.Status.ContainerStatuses {
		if containerStatus.State.Terminated != nil && containerStatus.State.Terminated.ExitCode != 0 {
			badContainers++
		}
	}
	if badContainers == len(pod.Status.ContainerStatuses) {
		pod.Status.Phase = v1.PodFailed
		pod.Status.Reason = "AllContainersStartFailed"
		pod.Status.Message = "All containers in the pod failed to start"
		pod.Status.StartTime = &startTime
		pod.Status.Conditions = []v1.PodCondition{
			{
				Type:               v1.PodScheduled,
				Status:             v1.ConditionTrue,
				LastTransitionTime: startTime,
			},
			{
				Type:               v1.PodReady,
				Status:             v1.ConditionFalse,
				LastTransitionTime: startTime,
			},
			{
				Type:               v1.PodInitialized,
				Status:             v1.ConditionTrue,
				LastTransitionTime: startTime,
			},
		}
		p.notifier(pod)
		return nil
	}

	// Set pod status to pending
	// pod.Status.Phase = v1.PodPending
	// pod.Status.Reason = "PodPending"
	// pod.Status.Message = "Pod is pending"
	// pod.Status.StartTime = &startTime
	// p.notifier(pod)
	pod.Status.Phase = v1.PodRunning
	pod.Status.Reason = "Running"
	pod.Status.Message = "Pod is running"
	pod.Status.StartTime = &startTime
	// set pod IP
	pod.Status.PodIP = os.Getenv("VKUBELET_POD_IP")
	// pod.Status.HostIP = os.Getenv("VKUBELET_POD_IP")
	pod.Status.Conditions = []v1.PodCondition{
		{
			Type:               v1.PodScheduled,
			Status:             v1.ConditionTrue,
			LastTransitionTime: startTime,
		},
		{
			Type:               v1.PodReady,
			Status:             v1.ConditionTrue,
			LastTransitionTime: startTime,
		},
		{
			Type:               v1.PodInitialized,
			Status:             v1.ConditionTrue,
			LastTransitionTime: startTime,
		},
	}
	p.notifier(pod)

	return nil
}

// UpdatePod accepts a Pod definition and updates its reference.
func (p *MockProvider) UpdatePod(ctx context.Context, pod *v1.Pod) error {
	ctx, span := trace.StartSpan(ctx, "UpdatePod")
	defer span.End()

	// Add the pod's coordinates to the current span.
	ctx = addAttributes(ctx, span, namespaceKey, pod.Namespace, nameKey, pod.Name)

	// log.G(ctx).Infof("receive UpdatePod %q", pod.Name)
	log.G(ctx).WithFields(log.Fields{"pod": pod.Name, "namespace": pod.Namespace, "message": "Received UpdatePod"}).Info("Pod status")

	key, err := buildKey(pod)
	if err != nil {
		return err
	}

	p.pods[key] = pod
	p.notifier(pod)

	return nil
}

// DeletePod removes the specified pod from memory.
func (p *MockProvider) DeletePod(ctx context.Context, pod *v1.Pod) error {
	// Start a new span for tracing
	ctx, span := trace.StartSpan(ctx, "DeletePod")
	defer span.End()

	// Add the pod's coordinates to the current span.
	ctx = addAttributes(ctx, span, namespaceKey, pod.Namespace, nameKey, pod.Name)

	// log.G(ctx).Infof("Received DeletePod %q", pod.Name)
	log.G(ctx).WithFields(log.Fields{"pod": pod.Name, "namespace": pod.Namespace, "message": "Received DeletePod"}).Info("Pod status")

	// Build key for pod
	key, err := buildKey(pod)
	if err != nil {
		return err
	}

	// Check if pod exists in memory
	if _, exists := p.pods[key]; !exists {
		return errdefs.NotFound("Pod not found")
	}

	// Delete pod from memory
	p.deletePod(ctx, pod)
	delete(p.pods, key)

	// Update pod status to indicate it has been deleted
	pod.Status.Phase = v1.PodUnknown
	pod.Status.Reason = "ManuallyDeleted"
	pod.Status.Message = "Pod has been deleted"
	pod.DeletionTimestamp = &metav1.Time{Time: time.Now()}

	// Notify about the pod deletion
	p.notifier(pod)

	return nil
}

// deletePod deletes a pod by killing its running processes and updating its status.
func (p *MockProvider) deletePod(ctx context.Context, pod *v1.Pod) error {

	now := metav1.Now()

	// Create a channel to receive errors
	errCh := make(chan error, len(pod.Status.ContainerStatuses))

	// Iterate over each container status in the pod
	for _, containerStatus := range pod.Status.ContainerStatuses {
		go func(containerStatus v1.ContainerStatus) { // Launch a goroutine for each container status
			// Get the process group ID (pgid) from the container ID
			pgid := containerStatus.ContainerID
			// Get the list of process IDs (pids)
			// pids, err := process.Pids()
			// if err != nil {
			// 	errCh <- fmt.Errorf("failed to get pids: %w", err)
			// 	return
			// }

			pids, username, err := getUserProcesses()
			if err != nil {
				errCh <- fmt.Errorf("failed to get user processes: %w", err)
				return
			}
			// log.G(ctx).Infof("Get current %v user processes: %v", username, pids)
			log.G(ctx).WithFields(log.Fields{"username": username, "pids": pids, "message": "Get current user processes"}).Info("Process status")

			// First, stop all processes
			var wg sync.WaitGroup

			for _, pid := range pids {
				wg.Add(1)
				go func(pid int) {
					defer wg.Done()

					// Create a new process instance
					proc, err := os.FindProcess(pid)
					if err != nil {
						return
					}

					// Get the process group ID (pgid) of the process and allow it to fail
					pgidInt, err := syscall.Getpgid(pid)
					if err != nil {
						errCh <- fmt.Errorf("failed to get pgid: %w", err)
						return
					}

					// Get the parent process ID (ppid) of the process
					ppid, err := getParentPid(pid)
					if err != nil {
						errCh <- fmt.Errorf("failed to get ppid: %w", err)
						return
					}

					// Get the process group ID (pgid) of the parent process
					ppgid, err := syscall.Getpgid(ppid)
					if err != nil {
						errCh <- fmt.Errorf("failed to get parent's pgid: %w", err)
						return
					}

					// Skip if the process group ID doesn't match and the parent's process group ID doesn't match
					if strconv.Itoa(pgidInt) != pgid && strconv.Itoa(ppgid) != pgid {
						return
					}

					// Send a SIGSTOP signal to the process
					// log.G(ctx).Infof("Stopping process %v\n", pid)
					log.G(ctx).WithFields(log.Fields{"pid": pid, "message": "Stopping process"}).Info("Process status")
					err = proc.Signal(syscall.SIGSTOP)
					if err != nil {
						errCh <- fmt.Errorf("failed to stop process: %w", err)
						return
					}
				}(int(pid))
			}

			wg.Wait()


			// Sleep for a short duration to give the OS time to stop the processes
			time.Sleep(3 * time.Second)

			for _, pid := range pids {
				wg.Add(1)
				go func(pid int) {
					defer wg.Done()

					// Create a new process instance
					proc, err := os.FindProcess(pid)
					if err != nil {
						return
					}

					// Get the process group ID (pgid) of the process and allow it to fail
					pgidInt, err := syscall.Getpgid(pid)
					if err != nil {
						errCh <- fmt.Errorf("failed to get pgid: %w", err)
						return
					}

					// Get the parent process ID (ppid) of the process
					ppid, err := getParentPid(pid)
					if err != nil {
						errCh <- fmt.Errorf("failed to get ppid: %w", err)
						return
					}

					// Get the process group ID (pgid) of the parent process
					ppgid, err := syscall.Getpgid(ppid)
					if err != nil {
						errCh <- fmt.Errorf("failed to get parent's pgid: %w", err)
						return
					}

					// Skip if the process group ID doesn't match and the parent's process group ID doesn't match
					if strconv.Itoa(pgidInt) != pgid && strconv.Itoa(ppgid) != pgid {
						return
					}

					// Send a SIGKILL signal to the process
					// log.G(ctx).Infof("Killing process %v\n", pid)
					log.G(ctx).WithFields(log.Fields{"pid": pid, "message": "Killing process"}).Info("Process status")
					err = proc.Signal(syscall.SIGKILL)
					if err != nil {
						errCh <- fmt.Errorf("failed to kill process: %w", err)
						return
					}
				}(int(pid))
			}

			wg.Wait()

			// Delete the pod's directory
			volumeDir := path.Join(os.Getenv("HOME"), pod.Namespace, pod.Name)
			err = os.RemoveAll(volumeDir)
			if err != nil {
				errCh <- fmt.Errorf("failed to delete pod directory: %w", err)
				return
			}

			// Update the container status
			containerStatus.State.Terminated = &v1.ContainerStateTerminated{
				ExitCode:   1,
				FinishedAt: now,
				Reason:     "PodDeleted",
				Message:    "Pod is deleted",
			}

			errCh <- nil // Send nil error when successful
		}(containerStatus)
	}

	// Wait for all goroutines to finish and check for errors
	for range pod.Status.ContainerStatuses {
		err := <-errCh
		if err != nil {
			// log.G(ctx).WithError(err).Error("Failed to delete pod")
			log.G(ctx).WithFields(log.Fields{"pod": pod.Name, "namespace": pod.Namespace, "err": err, "message": "Failed to delete pod"}).Error("Pod status")
			return err
		}
	}

	// Close the error channel
	close(errCh)

	return nil
}

// GetPod returns a pod by name that is stored in memory.
func (p *MockProvider) GetPod(ctx context.Context, namespace, name string) (pod *v1.Pod, err error) {
	ctx, span := trace.StartSpan(ctx, "GetPod")
	// I want to add the function that when I call this GetPod function, it will return the informtation of the process of the pod based on
	// the psgo command.

	defer func() {
		span.SetStatus(err)
		span.End()
	}()

	// Add the pod's coordinates to the current span.
	ctx = addAttributes(ctx, span, namespaceKey, namespace, nameKey, name)

	// log.G(ctx).Infof("receive GetPod %q", name)
	log.G(ctx).WithFields(log.Fields{"pod": name, "namespace": namespace, "message": "Received GetPod"}).Info("Pod status")

	key, err := buildKeyFromNames(namespace, name)
	if err != nil {
		return nil, err
	}

	if pod, ok := p.pods[key]; ok {
		return pod, nil
	}
	return nil, errdefs.NotFoundf("pod \"%s/%s\" is not known to the provider", namespace, name)
}

// GetContainerLogs retrieves the logs of a container by name from the provider.
func (p *MockProvider) GetContainerLogs(ctx context.Context, namespace, podName, containerName string, opts api.ContainerLogOpts) (io.ReadCloser, error) {
	ctx, span := trace.StartSpan(ctx, "GetContainerLogs")
	defer span.End()

	// Add pod and container attributes to the current span.
	ctx = addAttributes(ctx, span, namespaceKey, namespace, nameKey, podName, containerNameKey, containerName)

	// log.G(ctx).Infof("receive GetContainerLogs %q", podName)
	log.G(ctx).WithFields(log.Fields{"pod": podName, "namespace": namespace, "container": containerName, "message": "Received GetContainerLogs"}).Info("Pod status")
	return io.NopCloser(strings.NewReader("")), nil
}

// RunInContainer executes a command in a container in the pod, copying data
// between in/out/err and the container's stdin/stdout/stderr.
func (p *MockProvider) RunInContainer(ctx context.Context, namespace, name, container string, cmd []string, attach api.AttachIO) error {
	// log.G(context.TODO()).Infof("receive ExecInContainer %q", container)
	log.G(ctx).WithFields(log.Fields{"container": container, "message": "Received RunInContainer"}).Info("Container status")
	return nil
}

// AttachToContainer attaches to the executing process of a container in the pod, copying data
// between in/out/err and the container's stdin/stdout/stderr.
func (p *MockProvider) AttachToContainer(ctx context.Context, namespace, name, container string, attach api.AttachIO) error {
	// log.G(ctx).Infof("receive AttachToContainer %q", container)
	log.G(ctx).WithFields(log.Fields{"container": container, "message": "Received AttachToContainer"}).Info("Container status")
	return nil
}

// PortForward forwards a local port to a port on the pod
func (p *MockProvider) PortForward(ctx context.Context, namespace, pod string, port int32, stream io.ReadWriteCloser) error {
	// log.G(ctx).Infof("receive PortForward %q", pod)
	log.G(ctx).WithFields(log.Fields{"pod": pod, "message": "Received PortForward"}).Info("Pod status")
	return nil
}

// GetPodStatus returns the status of a pod by name that is "running".
// returns nil if a pod by that name is not found.
func (p *MockProvider) GetPodStatus(ctx context.Context, namespace, name string) (*v1.PodStatus, error) {
	ctx, span := trace.StartSpan(ctx, "GetPodStatus")
	defer span.End()

	// Add namespace and name as attributes to the current span.
	ctx = addAttributes(ctx, span, namespaceKey, namespace, nameKey, name)

	// log.G(ctx).Infof("receive GetPodStatus %q", name)
	log.G(ctx).WithFields(log.Fields{"pod": name, "namespace": namespace, "message": "Received GetPodStatus"}).Info("Pod status")

	pod, err := p.GetPod(ctx, namespace, name)
	if err != nil {
		return nil, err
	}

	return &pod.Status, nil
}

// GetPods returns a list of all pods known to be "running".
func (p *MockProvider) GetPods(ctx context.Context) ([]*v1.Pod, error) {
	ctx, span := trace.StartSpan(ctx, "GetPods")
	defer span.End()

	// log.G(ctx).Info("receive GetPods")
	log.G(ctx).WithFields(log.Fields{"message": "Received GetPods"}).Info("Pod status")

	var pods []*v1.Pod

	// Iterate over each pod
	for _, pod := range p.pods {
		// Create a new pod spec with the previous status and append it to the list
		if pod.Status.Phase == v1.PodFailed || pod.Status.Phase == v1.PodSucceeded || pod.Status.Phase == v1.PodPending {
			continue
		}
		pods = append(pods, p.createPodStatusFromContainerStatus(ctx, pod))
	}

	return pods, nil
}

func (p *MockProvider) ConfigureNode(ctx context.Context, n *v1.Node) { //nolint:golint
	ctx, span := trace.StartSpan(ctx, "mock.ConfigureNode") //nolint:staticcheck,ineffassign
	defer span.End()

	if p.config.ProviderID != "" {
		n.Spec.ProviderID = p.config.ProviderID
	}
	n.Status.Capacity = p.capacity()
	n.Status.Allocatable = p.capacity()
	n.Status.Conditions = p.nodeConditions()
	n.Status.Addresses = p.nodeAddresses()
	n.Status.DaemonEndpoints = p.nodeDaemonEndpoints()
	operationSystem := p.operatingSystem
	if operationSystem == "" {
		operationSystem = "linux"
	}
	n.Status.NodeInfo.OperatingSystem = operationSystem
	n.Status.NodeInfo.Architecture = "amd64"
	n.ObjectMeta.Labels["alpha.service-controller.kubernetes.io/exclude-balancer"] = "true"
	n.ObjectMeta.Labels["node.kubernetes.io/exclude-from-external-load-balancers"] = "true"
	n.ObjectMeta.Labels["jiriaf.nodetype"] = os.Getenv("JIRIAF_NODETYPE")
	n.ObjectMeta.Labels["jiriaf.site"] = os.Getenv("JIRIAF_SITE")

	if os.Getenv("JIRIAF_WALLTIME") != "0" {
		go p.aliveTimeLoop(ctx, n)
	}
}

func (p *MockProvider) aliveTimeLoop(ctx context.Context, n *v1.Node) {
	startTime := time.Now()
	wallTime := os.Getenv("JIRIAF_WALLTIME")
	n.ObjectMeta.Labels["jiriaf.walltime"] = wallTime
	n.ObjectMeta.Labels["jiriaf.alivetime"] = wallTime

	t := time.NewTimer(5 * time.Second)

	if !t.Stop() {
		<-t.C
	}

	for {
		t.Reset(5 * time.Second)
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			p.notifyNodeAliveTime(ctx, n, startTime, wallTime)
		}
	}
}

func (p *MockProvider) notifyNodeAliveTime(ctx context.Context, n *v1.Node, startTime time.Time, wallTime string) {
	wallTimeInt, _ := strconv.ParseInt(wallTime, 10, 64)
	// Start the time when this goroutine starts
	// initialize the node alive time by setting jiriaf.alivetime label as JIRIAF_WALLTIME
	// Calculate elapsed time in seconds
	elapsedTime := time.Since(startTime).Seconds()

	// Calculate aliveTime as wallTime - elapsedTime
	aliveTime := wallTimeInt - int64(elapsedTime)

	// Update the aliveTime label
	// cfg.NodeSpec.Labels["jiriaf.alivetime"] = strconv.FormatInt(aliveTime, 10)
	n.ObjectMeta.Labels["jiriaf.alivetime"] = strconv.FormatInt(aliveTime, 10)

	// if aliveTime is less than 0, set node status to NotReady
	if aliveTime <= 0 {
		n.ObjectMeta.Labels["jiriaf.alivetime"] = "0"
		n.Status.Conditions[0].Status = v1.ConditionFalse
		n.Status.Conditions[0].Reason = "NodeNotReady"
		n.Status.Conditions[0].Message = "Node is not ready"
	}
	// log.G(ctx).Info("Updating node alive time, aliveTime: ", aliveTime)
	log.G(ctx).WithFields(log.Fields{"aliveTime": aliveTime, "message": "Updating node alive time"}).Info("Node status")
}

// Capacity returns a resource list containing the capacity limits.
func (p *MockProvider) capacity() v1.ResourceList {
	// Get the number of CPUs and total system memory
	numCPUs := int64(runtime.NumCPU())
	totalMemory := int64(getSystemTotalMemory())
	// convert totalMemory to KiB
	totalMemory = totalMemory / 1024
	//add Ki to the end of totalMemory
	totalMemoryStr := fmt.Sprintf("%dKi", totalMemory)

	// Create quantities for CPU and memory
	cpuQuantity := resource.Quantity{}
	cpuQuantity.Set(numCPUs)

	// set memoryQuantity as totalMemoryStr
	memoryQuantity := resource.MustParse(totalMemoryStr)

	// make memoryQuantity in the unit of KiB
	// Set a static quantity for pods
	podsQuantity := resource.MustParse("1000")

	// Return a resource list with the quantities
	return v1.ResourceList{
		"cpu":    cpuQuantity,
		"memory": memoryQuantity,
		"pods":   podsQuantity,
	}
}

// NodeConditions returns a list of conditions (Ready, OutOfDisk, etc), for updates to the node status
// within Kubernetes.
func (p *MockProvider) nodeConditions() []v1.NodeCondition {
	// TODO: Make this configurable
	return []v1.NodeCondition{
		{
			Type:               "Ready",
			Status:             v1.ConditionFalse,
			LastHeartbeatTime:  metav1.Now(),
			LastTransitionTime: metav1.Now(),
			Reason:             "KubeletPending",
			Message:            "kubelet is pending.",
		},
		{
			Type:               "OutOfDisk",
			Status:             v1.ConditionFalse,
			LastHeartbeatTime:  metav1.Now(),
			LastTransitionTime: metav1.Now(),
			Reason:             "KubeletHasSufficientDisk",
			Message:            "kubelet has sufficient disk space available",
		},
		{
			Type:               "MemoryPressure",
			Status:             v1.ConditionFalse,
			LastHeartbeatTime:  metav1.Now(),
			LastTransitionTime: metav1.Now(),
			Reason:             "KubeletHasSufficientMemory",
			Message:            "kubelet has sufficient memory available",
		},
		{
			Type:               "DiskPressure",
			Status:             v1.ConditionFalse,
			LastHeartbeatTime:  metav1.Now(),
			LastTransitionTime: metav1.Now(),
			Reason:             "KubeletHasNoDiskPressure",
			Message:            "kubelet has no disk pressure",
		},
		{
			Type:               "NetworkUnavailable",
			Status:             v1.ConditionFalse,
			LastHeartbeatTime:  metav1.Now(),
			LastTransitionTime: metav1.Now(),
			Reason:             "RouteCreated",
			Message:            "RouteController created a route",
		},
	}

}

// NodeAddresses returns a list of addresses for the node status
// within Kubernetes.
func (p *MockProvider) nodeAddresses() []v1.NodeAddress {
	return []v1.NodeAddress{
		{
			Type:    "InternalIP",
			Address: p.internalIP,
		},
	}
}

// NodeDaemonEndpoints returns NodeDaemonEndpoints for the node status
// within Kubernetes.
func (p *MockProvider) nodeDaemonEndpoints() v1.NodeDaemonEndpoints {
	return v1.NodeDaemonEndpoints{
		KubeletEndpoint: v1.DaemonEndpoint{
			Port: p.daemonEndpointPort,
		},
	}
}

// GetStatsSummary returns dummy stats for all pods known by this provider.
func (p *MockProvider) GetStatsSummary(ctx context.Context) (*stats.Summary, error) {
	var span trace.Span
	ctx, span = trace.StartSpan(ctx, "GetStatsSummary") //nolint: ineffassign,staticcheck
	defer span.End()

	// Grab the current timestamp so we can report it as the time the stats were generated.
	time := metav1.NewTime(time.Now())

	// Create the Summary object that will later be populated with node and pod stats.
	res := &stats.Summary{}

	// Populate the Summary object with basic node stats.
	res.Node = stats.NodeStats{
		NodeName:  p.nodeName,
		StartTime: metav1.NewTime(p.startTime),
	}

	// Populate the Summary object with dummy stats for each pod known by this provider.
	for _, pod := range p.pods {
		var (
			// totalUsageNanoCores will be populated with the sum of the values of UsageNanoCores computes across all containers in the pod.
			totalUsageNanoCores uint64
			// totalUsageBytes will be populated with the sum of the values of UsageBytes computed across all containers in the pod.
			totalUsageBytes uint64
		)

		// Create a PodStats object to populate with pod stats.
		pss := stats.PodStats{
			PodRef: stats.PodReference{
				Name:      pod.Name,
				Namespace: pod.Namespace,
				UID:       string(pod.UID),
			},
			StartTime: pod.CreationTimestamp,
		}

		// Iterate over all containers in the current pod to compute dummy stats.
		for _, container := range pod.Spec.Containers {
			// Grab a dummy value to be used as the total CPU usage.
			// The value should fit a uint32 in order to avoid overflows later on when computing pod stats.

			/* #nosec */
			dummyUsageNanoCores := uint64(rand.Uint32())
			totalUsageNanoCores += dummyUsageNanoCores
			// Create a dummy value to be used as the total RAM usage.
			// The value should fit a uint32 in order to avoid overflows later on when computing pod stats.

			/* #nosec */
			dummyUsageBytes := uint64(rand.Uint32())
			totalUsageBytes += dummyUsageBytes
			// Append a ContainerStats object containing the dummy stats to the PodStats object.
			pss.Containers = append(pss.Containers, stats.ContainerStats{
				Name:      container.Name,
				StartTime: pod.CreationTimestamp,
				CPU: &stats.CPUStats{
					Time:           time,
					UsageNanoCores: &dummyUsageNanoCores,
				},
				Memory: &stats.MemoryStats{
					Time:       time,
					UsageBytes: &dummyUsageBytes,
				},
			})
		}

		// Populate the CPU and RAM stats for the pod and append the PodsStats object to the Summary object to be returned.
		pss.CPU = &stats.CPUStats{
			Time:           time,
			UsageNanoCores: &totalUsageNanoCores,
		}
		pss.Memory = &stats.MemoryStats{
			Time:       time,
			UsageBytes: &totalUsageBytes,
		}
		res.Pods = append(res.Pods, pss)
	}

	// Return the dummy stats.
	return res, nil
}

func (p *MockProvider) getMetricType(metricName string) *dto.MetricType {
	var (
		dtoCounterMetricType = dto.MetricType_COUNTER
		dtoGaugeMetricType   = dto.MetricType_GAUGE
		cpuMetricSuffix      = "_cpu_usage_seconds_total"
		memoryMetricSuffix   = "_memory_working_set_bytes"
	)
	if strings.HasSuffix(metricName, cpuMetricSuffix) {
		return &dtoCounterMetricType
	}
	if strings.HasSuffix(metricName, memoryMetricSuffix) {
		return &dtoGaugeMetricType
	}

	return nil
}

func (p *MockProvider) GetMetricsResource(ctx context.Context) ([]*dto.MetricFamily, error) {
	// Start a new span for tracing
	ctx, span := trace.StartSpan(ctx, "GetMetricsResource")
	defer span.End()

	// Define label names
	var (
		nodeNameLabel      = "node"
		podNameLabel       = "pod"
		containerNameLabel = "container"
		namespaceLabel     = "namespace"
		pgidLabel          = "pgid"
	)

	// Create node labels
	nodeLabels := []*dto.LabelPair{
		{
			Name:  &nodeNameLabel,
			Value: &p.nodeName,
		},
	}

	// Generate node metrics
	metricsMap := p.generateNodeMetrics(ctx, nil, nodeNameLabel, nodeLabels)

	// Iterate over pods to generate pod and container metrics
	for _, pod := range p.pods {
		// iterate only running pods
		if pod.Status.Phase != v1.PodRunning {
			continue
		}

		podLabels := []*dto.LabelPair{
			{Name: &nodeNameLabel, Value: &p.nodeName},
			{Name: &namespaceLabel, Value: &pod.Namespace},
			{Name: &podNameLabel, Value: &pod.Name},
		}

		metricsMap, pgidMap := p.generatePodMetrics(ctx, pod, metricsMap, podNameLabel, podLabels)

		// Iterate over containers in the pod
		for _, container := range pod.Spec.Containers {
			containerName := container.Name
			// Skip if container state is terminated
			if status := getContainerStatus(pod, container.Name); status != nil && status.State.Terminated != nil {
				continue
			}

			// Create container labels
			pgidLabelStr := strconv.Itoa(pgidMap[container.Name])
			containerLabels := []*dto.LabelPair{
				{Name: &nodeNameLabel, Value: &p.nodeName},
				{Name: &containerNameLabel, Value: &containerName},
				{Name: &namespaceLabel, Value: &pod.Namespace},
				{Name: &podNameLabel, Value: &pod.Name},
				{Name: &pgidLabel, Value: &pgidLabelStr},
			}

			// Generate container metrics
			pgidFile := path.Join(os.Getenv("HOME"), pod.Namespace, pod.Name, "containers", container.Name, "pgid")
			metricsMap = p.generateContainerMetrics(ctx, &container, metricsMap, containerNameLabel, containerLabels, pgidFile)
		}
	}

	// Convert metrics map to slice of metric families
	res := []*dto.MetricFamily{}
	for metricName := range metricsMap {
		tempName := metricName
		tempMetrics := metricsMap[tempName]

		metricFamily := dto.MetricFamily{
			Name:   &tempName,
			Type:   p.getMetricType(tempName),
			Metric: tempMetrics,
		}
		res = append(res, &metricFamily)
	}

	return res, nil
}

// NotifyPods is called to set a pod notifier callback function. This should be called before any operations are done
// within the provider.
func (p *MockProvider) NotifyPods(ctx context.Context, notifier func(*v1.Pod)) {
	p.notifier = notifier
	go p.statusLoop(ctx)

}

func (p *MockProvider) statusLoop(ctx context.Context) {
	t := time.NewTimer(5 * time.Second)
	if !t.Stop() {
		<-t.C
	}

	for {
		t.Reset(5 * time.Second)
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}

		if err := p.notifyPodStatuses(ctx); err != nil {
			// log.G(ctx).WithError(err).Error("Error updating node statuses")
			log.G(ctx).WithFields(log.Fields{"err": err, "message": "Error updating node statuses"}).Error("Node status")
		}
	}
}

func (p *MockProvider) notifyPodStatuses(ctx context.Context) error {
	ls, err := p.GetPods(ctx)
	if err != nil {
		return err
	}

	for _, pod := range ls {
		p.notifier(pod)
		log.G(ctx).WithFields(log.Fields{"pod": pod.Name, "status": pod.Status}).Info("Pod status")
	}

	return nil
}

func buildKeyFromNames(namespace string, name string) (string, error) {
	return fmt.Sprintf("%s-%s", namespace, name), nil
}

// buildKey is a helper for building the "key" for the providers pod store.
func buildKey(pod *v1.Pod) (string, error) {
	if pod.ObjectMeta.Namespace == "" {
		return "", fmt.Errorf("pod namespace not found")
	}

	if pod.ObjectMeta.Name == "" {
		return "", fmt.Errorf("pod name not found")
	}

	return buildKeyFromNames(pod.ObjectMeta.Namespace, pod.ObjectMeta.Name)
}

// addAttributes adds the specified attributes to the provided span.
// attrs must be an even-sized list of string arguments.
// Otherwise, the span won't be modified.
// TODO: Refactor and move to a "tracing utilities" package.
func addAttributes(ctx context.Context, span trace.Span, attrs ...string) context.Context {
	if len(attrs)%2 == 1 {
		return ctx
	}
	for i := 0; i < len(attrs); i += 2 {
		ctx = span.WithField(ctx, attrs[i], attrs[i+1])
	}
	return ctx
}

func filterContainersByPgid(pod *v1.Pod, pgidMap map[string]int) []v1.Container {
	var filteredContainers []v1.Container
	seenPgid := make(map[int]bool)

	for _, container := range pod.Spec.Containers {
		pgid, ok := pgidMap[container.Name]
		if ok && !seenPgid[pgid] {
			filteredContainers = append(filteredContainers, container)
			seenPgid[pgid] = true
		}
	}
	// log.G(context.Background()).Infof("filteredContainers: %v", filteredContainers)
	log.G(context.Background()).WithFields(log.Fields{"filteredContainers": filteredContainers, "message": "Filtered containers"}).Info("Container status")
	return filteredContainers
}

// get container status from the container name
func getContainerStatus(pod *v1.Pod, containerName string) *v1.ContainerStatus {
	for _, containerStatus := range pod.Status.ContainerStatuses {
		if containerStatus.Name == containerName {
			return &containerStatus
		}
	}
	return nil
}


func getUserProcesses() ([]int32, string, error) {
    // Get the current user
    currentUser, err := user.Current()
    if err != nil {
        return nil, "", fmt.Errorf("Failed to get current user: %v", err)
    }

    // Get the username of the current user
    username := currentUser.Username

    // Get a list of all process IDs
    pids, err := process.Pids()
    if err != nil {
        return nil, username, fmt.Errorf("Failed to get process IDs: %v", err)
    }

    userPids := []int32{}

    // Iterate over each process ID
    for _, pid := range pids {
        // Create a new process instance
        proc, err := process.NewProcess(pid)
        if err != nil {
            fmt.Println("Failed to get process", pid, ":", err)
            continue
        }

        // Get the username of the process
        procUsername, err := proc.Username()
        if err != nil {
            fmt.Println("Failed to get process username:", err)
            continue
        }

        // If the process username matches the current user's username, then the process belongs to the current user
        if procUsername == username {
            userPids = append(userPids, pid)
        }
    }

    return userPids, username, nil
}


func getParentPid(pid int) (int, error) {
    // Open the /proc/<pid>/stat file
    file, err := os.Open(fmt.Sprintf("/proc/%d/stat", pid))
    if err != nil {
        return 0, err
    }
    defer file.Close()

    // Read the contents of the file
    b, err := ioutil.ReadAll(file)
    if err != nil {
        return 0, err
    }

    // The contents of the file are space-separated values
    // The fourth value is the parent process ID (ppid)
    fields := strings.Fields(string(b))
    if len(fields) < 4 {
        return 0, fmt.Errorf("could not parse /proc/%d/stat", pid)
    }

    // Convert the ppid to an integer
    ppid, err := strconv.Atoi(fields[3])
    if err != nil {
        return 0, err
    }

    return ppid, nil
}