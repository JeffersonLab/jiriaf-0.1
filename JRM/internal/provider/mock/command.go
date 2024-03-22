package mock

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path"
	"strings"
	"sync"
	"time"
	"github.com/virtual-kubelet/virtual-kubelet/log"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"syscall"
	"io"
)

func newCollectScripts(ctx context.Context, container *v1.Container, podName string, volumeMap map[string]string, ns string) (map[string]string, *v1.ContainerState, error) {
	startTime := metav1.NewTime(time.Now())

	// Define a map to store the bash scripts, with the container name as the key and the list of bash scripts as the value
	scriptMap := make(map[string]string)
	var containerState *v1.ContainerState

	// Iterate over each volume mount in the container
	for _, volumeMount := range container.VolumeMounts {
		defaultVolumeDirectory := volumeMap[volumeMount.Name]
		mountDirectory := path.Join(os.Getenv("HOME"), ns, podName, "containers", container.Name, volumeMount.MountPath)

		log.G(ctx).WithField("volume name", volumeMount.Name).WithField("mount directory", mountDirectory).Info("Processing volumeMount")

		// Scan the default volume directory for files
		files, err := ioutil.ReadDir(defaultVolumeDirectory)
		if err != nil {		
			containerState = handleCollectScriptsError(ctx, *container, fmt.Sprintf("Failed to read default volume directory %s; error: %v", defaultVolumeDirectory, err), "readDefaultVolDirError", err, startTime)
			return nil, containerState, err
		}


		// Iterate over each file in the default volume directory
		for _, file := range files {
			log.G(ctx).WithField("File name", file.Name()).Info("File in default volume directory")

			// If the file name contains "crt", "key", or "pem", skip it
			if strings.Contains(file.Name(), "crt") || strings.Contains(file.Name(), "key") || strings.Contains(file.Name(), "pem") {
				log.G(ctx).WithField("file_name", file.Name()).Info("File name contains crt, key, or pem, skipping it")
				continue
			}

			// Copy the file to the mount directory
			err := copyFile(ctx, defaultVolumeDirectory, mountDirectory, file.Name())
			if err != nil {
				containerState = handleCollectScriptsError(ctx, *container, fmt.Sprintf("Failed to copy file %s to %s; error: %v", path.Join(defaultVolumeDirectory, file.Name()), path.Join(mountDirectory, file.Name()), err), "copyFileError", err, startTime)
				return nil, containerState, err
			}

			// Add the script path to the script map
			scriptPath := path.Join(mountDirectory, file.Name())
			scriptMap[volumeMount.Name] = scriptPath
		}
	}

	return scriptMap, nil, nil
}

func (p *MockProvider) runScriptParallel(ctx context.Context, pod *v1.Pod, volumeMap map[string]string) (chan error, chan v1.ContainerStatus) {
	var wg sync.WaitGroup
	errorChannel := make(chan error, len(pod.Spec.Containers))
	containerStatusChannel := make(chan v1.ContainerStatus, len(pod.Spec.Containers))
	startTime := metav1.NewTime(time.Now())

	for _, container := range pod.Spec.Containers {
		wg.Add(1)
		go func(container v1.Container) {
			defer wg.Done()
			log.G(ctx).WithField("container", container.Name).Info("Starting container")

			// Collect scripts for the container
			scriptMap, containerState, err := newCollectScripts(ctx, &container, pod.Name, volumeMap, pod.Namespace)
			if err != nil {
				errorChannel <- err
				containerStatusChannel <- generateContainerStatus(container, "", false, containerState, 0)
				return
			}

			// Get the script path for the container image
			scriptPath := scriptMap[container.Image]
			command := container.Command
			if len(command) == 0 {
				log.G(ctx).WithField("container", container.Name).Errorf("No command found for container")
				errorChannel <- fmt.Errorf("no command found for container: %s", container.Name)
				return
			}

			// Combine the command and scriptPath
			command = append(command, scriptPath)

			// Prepare the arguments for the command
			args := prepareArgs(container.Args)

			// Run the script and get the process group ID
			pgid, containerState, err := runScript(ctx, command, args, container.Env, path.Dir(scriptPath), startTime)
			if err != nil {
				errorChannel <- err
				containerStatusChannel <- generateContainerStatus(container, scriptPath, false, containerState, pgid)
				return
			}

			// Write the process group ID to a file

			pgidDir := path.Join(os.Getenv("HOME"), pod.Namespace, pod.Name, "containers", container.Name)
			pgidFile := path.Join(pgidDir, "pgid")
			log.G(ctx).WithField("pgid file path", pgidFile).Info("pgid file path")
			err = ioutil.WriteFile(pgidFile, []byte(fmt.Sprintf("%d\n", pgid)), 0644)
			if err != nil {
				containerState = &v1.ContainerState{
					Terminated: &v1.ContainerStateTerminated{
						Message:    fmt.Sprintf("failed to write pgid to file %s; error: %v", pgidFile, err),
						FinishedAt: metav1.NewTime(time.Now()),
						Reason:     "writePgidError",
						ExitCode: 10,
						StartedAt:  startTime,
					},
				}
				errorChannel <- err
				containerStatusChannel <- generateContainerStatus(container, scriptPath, false, containerState, pgid)
				return
			}

			// Send the container status to the channel
			// containerStatusChannel <- generateContainerStatus(container, scriptPath, false, &v1.ContainerState{
			// 	Waiting: &v1.ContainerStateWaiting{
			// 		Message: fmt.Sprintf("container %s is waiting for the command to finish", container.Name),
			// 		Reason:  "containerStarted",
			// 	},
			// }, pgid)
			containerStatusChannel <- generateContainerStatus(container, scriptPath, false, &v1.ContainerState{
				Running: &v1.ContainerStateRunning{
					StartedAt: startTime,
				},
			}, pgid)
		}(container)
	}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.G(ctx).WithField("error", r).Error("Recovered from panic while closing channels")
			}
		}()

		wg.Wait()

		close(errorChannel)
		log.G(ctx).Info("errorChannel closed")

		close(containerStatusChannel)
		log.G(ctx).Info("containerStatusChannel closed")
	}()

	return errorChannel, containerStatusChannel
}

func generateContainerStatus(container v1.Container, scriptPath string, ready bool, state *v1.ContainerState, containerID int) v1.ContainerStatus {
	return v1.ContainerStatus{
		Name:         container.Name,
		Image:        container.Image,
		ImageID:      scriptPath,
		Ready:        ready,
		RestartCount: 0,
		State:        *state,
		ContainerID: fmt.Sprintf("%d", containerID),
	}
}

func prepareArgs(args []string) string {
	if len(args) > 0 {
		return strings.Join(args, " ")
	}
	return ""
}

func runScript(ctx context.Context, command []string, args string, env []v1.EnvVar, stdoutPath string, startTime metav1.Time) (int, *v1.ContainerState, error) {
	// Create a map of environment variables
	envMap := createEnvironmentMap()

	// Update the environment variables with the provided ones
	updateEnvironmentVariables(ctx, &envMap, env)

	// Prepare the command to be executed
	cmd := prepareCommand(ctx, command, args, envMap)

	// Set new process group id for the command 
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	// Create stdout and stderr pipes
	stdoutIn, _ := cmd.StdoutPipe() 
	stderrIn, _ := cmd.StderrPipe()

	// Create a WaitGroup
	// var wg sync.WaitGroup

	// Increment the WaitGroup counter
	// wg.Add(1)
	// Start the command
	err := cmd.Start()
	if err != nil {
		return handleRunCmdError(ctx, cmd, err, 0, "cmd.Start() failed", startTime, "cmdStartError")
	}

	// Get the process group id
	pgid, err := syscall.Getpgid(cmd.Process.Pid)
	if err != nil {
		return handleRunCmdError(ctx, cmd, err, 0, "failed to get pgid", startTime, "getPgidError")
	}


	// write the stdout and stderr to files without waiting for the command to finish
	stdoutFile, err := os.Create(path.Join(stdoutPath, "stdout"))
	if err != nil {
		return handleRunCmdError(ctx, cmd, err, pgid, "failed to create stdout file", startTime, "createStdoutFileError")
	}
	stderrFile, err := os.Create(path.Join(stdoutPath, "stderr"))
	if err != nil {
		return handleRunCmdError(ctx, cmd, err, pgid, "failed to create stderr file", startTime, "createStderrFileError")
	}

	go func() {
		//write stdout to sdout file
		_, _ = io.Copy(stdoutFile, stdoutIn)
		stdoutFile.Close()
	}()
	
	go func() {
		//write a function to read stderr and write to stderr file
		_, _ = io.Copy(stderrFile, stderrIn)
		stderrFile.Close()
	}()

	// Define a struct to hold the return values of handleCommandRunError
	type Result struct {
		Pgid int
		State    *v1.ContainerState
		Err      error
	}

	// Create a channel to receive the result of handleCommandRunError
	resultCh := make(chan Result)

	// Watch the stderr pipe for errors, if any, return the error and the container state
	go func() {
		// defer wg.Done()
		err := cmd.Wait()
		if err != nil {
			pgid, state, err := handleRunCmdError(ctx, cmd, err, pgid, "cmd.Wait() failed", startTime, "cmdWaitError")
			resultCh <- Result{Pgid: pgid, State: state, Err: err}
			return
		}
		resultCh <- Result{Pgid: pgid, State: nil, Err: nil}
	}()

	// Wait for all commands to finish
	// wg.Wait()

	// In your main function, receive the result from the channel
	// In your main function, receive the result from the channel
	select {
	case result := <-resultCh:
		if result.Err != nil {
			return result.Pgid, result.State, result.Err
		}else{
			return result.Pgid, nil, nil
		}
	case <-time.After(time.Second * 1/2): // adjust the timeout as needed. Can't be > 5 secs or the method getPods will be executed.
		log.G(ctx).WithField("command", cmd.Args).Info("Command is not finished yet after 1/2 seconds")
		return pgid, nil, nil
	}
}


func createEnvironmentMap() map[string]string {
	envMap := make(map[string]string)
	for _, e := range os.Environ() {
		pair := strings.SplitN(e, "=", 2)
		envMap[pair[0]] = pair[1]
	}
	return envMap
}

func updateEnvironmentVariables(ctx context.Context, envMap *map[string]string, env []v1.EnvVar) {
	for _, e := range env {
		e.Value = strings.ReplaceAll(e.Value, "~", os.Getenv("HOME"))
		e.Value = strings.ReplaceAll(e.Value, "$HOME", os.Getenv("HOME"))
		(*envMap)[e.Name] = e.Value
	}
}

func prepareCommand(ctx context.Context, command []string, args string, envMap map[string]string) *exec.Cmd {
	cmd := exec.Command("bash")
	cmdString := strings.Join(command, " ")
	expand := func(s string) string {
		return envMap[s]
	}
	cmd.Args = append(cmd.Args, "-c", os.Expand(cmdString, expand)+" "+os.Expand(args, expand))
	// Set the environment variables for the command
	cmd.Env = os.Environ()
	for k, v := range envMap {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
	}

	log.G(ctx).WithField("command", cmd.Args).Info("Command to be executed")
	return cmd
}

func handleRunCmdError(ctx context.Context, cmd *exec.Cmd, err error, pgid int, message string, startTime metav1.Time, reason string) (int, *v1.ContainerState, error) {
	log.G(ctx).WithField("command", cmd.Args).Errorf("Reason: %s, Message: %s, Error: %v", reason, message, err)
	return pgid, &v1.ContainerState{
		Terminated: &v1.ContainerStateTerminated{
			ExitCode:   1,
			Reason:     reason,
			Message:    fmt.Sprintf("%v, error: %v", message, err.Error()),
			StartedAt:  startTime,
			FinishedAt: metav1.Now(),
		},
	}, err
}

func handleCollectScriptsError(ctx context.Context, c v1.Container, message, reason string, err error, startTime metav1.Time) *v1.ContainerState {
	log.G(ctx).WithField("container", c.Name).Errorf("Reason: %s, Message: %s, Error: %v", reason, message, err)
	return &v1.ContainerState{
		Terminated: &v1.ContainerStateTerminated{
			Message:    message,
			FinishedAt: metav1.NewTime(time.Now()),
			Reason:     reason,
			ExitCode: 1,
			StartedAt:  startTime,
		},
	}
}



func copyFile(ctx context.Context, src string, dst string, filename string) error {
	err := createDirectory(ctx, dst)
	if err != nil {
		return err
	}

	err = copySourceFileToDestination(ctx, src, dst, filename)
	if err != nil {
		return err
	}

	return nil
}

func createDirectory(ctx context.Context, dst string) error {
	err := exec.Command("mkdir", "-p", dst).Run()
	if err != nil {
		log.G(ctx).WithField("directory", dst).Errorf("failed to create directory; error: %v", err)
		return err
	}
	return nil
}

func copySourceFileToDestination(ctx context.Context, src string, dst string, filename string) error {
	err := exec.Command("cp", path.Join(src, filename), path.Join(dst, filename)).Run()
	if err != nil {
		log.G(ctx).WithFields(log.Fields{
			"source":      path.Join(src, filename),
			"destination": path.Join(dst, filename),
		}).Errorf("failed to copy file; error: %v", err)
		return err
	}
	return nil
}