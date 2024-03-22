package mock

import (
	"context"
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strconv"

	"github.com/virtual-kubelet/virtual-kubelet/log"

	// vklogv2 "github.com/virtual-kubelet/virtual-kubelet/log/klogv2"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
)

var varrun = os.Getenv("HOME")

const (
	emptyDir     = "emptydirs"
	secretDir    = "secrets"
	configmapDir = "configmaps"
)

// Volume describes what volumes should be created.
type Volume int

const (
	volumeAll Volume = iota
	volumeConfigMap
	volumeSecret
)

// volumes inspects the PodSpec.Volumes attribute and returns a mapping with the volume's Name and the directory on-disk that
// should be used for this. The on-disk structure is prepared and can be used.
// which considered what volumes should be setup. Defaults to volumeAll
func (p *MockProvider) volumes(ctx context.Context, pod *v1.Pod, which Volume) (map[string]string, error) {
	// type pwatch struct {
	// 	podResourceManager kubernetes.PodResourceManager
	// }

	// var log = vklogv2.New(nil)
	// fnlog := log.
	// 	WithField("podNamespace", pod.Namespace).
	// 	WithField("podName", pod.Name)

	vol := make(map[string]string)
	log.G(ctx).Infof("inspecting volumes for pod %s", pod.Name)
	uid, gid, err := uidGidFromSecurityContext(pod, 0)
	log.G(ctx).Infof("uid: %s, gid: %s", uid, gid)

	if err != nil {
		return nil, err
	}
	for _, v := range pod.Spec.Volumes {
		log.G(ctx).Infof("inspecting volume %s", v.Name)
		i := v.Name
		switch {
		case v.HostPath != nil:
			if which != volumeAll {
				continue
			}

			// v.Path should exist and be usuable by this pod. No checks are done here.
			vol[v.Name] = ""

		case v.EmptyDir != nil:
			if which != volumeAll {
				continue
			}
			dir, err := setupPaths(pod, emptyDir, i)
			if err != nil {
				return nil, err
			}
			log.G(ctx).Infof("created %q for emptyDir %q", dir, v.Name)
			vol[v.Name] = dir

		case v.Secret != nil:
			if which != volumeAll && which != volumeSecret {
				continue
			}

			secret, err := p.rm.GetSecret(v.Secret.SecretName, pod.Namespace)
			if v.Secret.Optional != nil && !*v.Secret.Optional && errors.IsNotFound(err) {
				return nil, fmt.Errorf("secret %s is required by pod %s and does not exist", v.Secret.SecretName, pod.Name)
			}
			if secret == nil {
				continue
			}

			dir, err := setupPaths(pod, secretDir, i)
			if err != nil {
				return nil, err
			}
			log.G(ctx).Infof("created %q for secret %q", dir, v.Name)

			for k, v := range secret.StringData {
				data, err := base64.StdEncoding.DecodeString(string(v))
				if err != nil {
					return nil, err
				}
				if err := writeFile(ctx, dir, k, uid, gid, data); err != nil {
					return nil, err
				}
			}
			for k, v := range secret.Data {
				if err := writeFile(ctx, dir, k, uid, gid, []byte(v)); err != nil {
					return nil, err
				}
			}
			// joint the path of dir and k
			vol[v.Name] = dir

		case v.ConfigMap != nil:
			if which != volumeAll && which != volumeConfigMap {
				continue
			}
			log.G(ctx).Infof("inspecting configMap %s", v.ConfigMap.Name)
			configMap, err := p.rm.GetConfigMap(v.ConfigMap.Name, pod.Namespace)
			if v.ConfigMap.Optional != nil && !*v.ConfigMap.Optional && errors.IsNotFound(err) {
				return nil, fmt.Errorf("configMap %s is required by pod %s and does not exist", v.ConfigMap.Name, pod.Name)
			}
			if configMap == nil {
				continue
			}

			dir, err := setupPaths(pod, configmapDir, i)
			if err != nil {
				return nil, err
			}

			log.G(ctx).Infof("created %q for configmap %q", dir, v.Name)

			for k, v := range configMap.Data {
				if err := writeFile(ctx, dir, k, uid, gid, []byte(v)); err != nil {
					return nil, err
				}
			}
			for k, v := range configMap.BinaryData {
				if err := writeFile(ctx, dir, k, uid, gid, v); err != nil {
					return nil, err
				}
			}
			vol[v.Name] = dir

		case v.Projected != nil:
			for _, source := range v.Projected.Sources {
				switch {
				case source.ServiceAccountToken != nil:
					// This is still stored in a secret, hence the dance to figure out what secret.
					// secrets, err := p.podResourceManager.SecretLister().Secrets(pod.Namespace).List(labels.Everything())
					secrets, err := p.rm.ListSecrets(pod.Namespace)
					if err != nil {
						return nil, err
					}
				Secrets:
					for _, secret := range secrets {
						if secret.Type != v1.SecretTypeServiceAccountToken {
							continue
						}
						// annotation now needs to match the pod.ServiceAccountName
						for k, a := range secret.ObjectMeta.Annotations {
							if k == "kubernetes.io/service-account.name" && a == pod.Spec.ServiceAccountName {
								// this is the secret we're after. Now the projected service account has a path element, which is the only path
								// we want from this secret, but it could still be in StringData or Data
								dir, err := setupPaths(pod, secretDir, i)
								if err != nil {
									return nil, err
								}

								log.G(ctx).Infof("created %q for projected serviceAccountToken (secret) %q", dir, v.Name)

								for k, v := range secret.StringData {
									data, err := base64.StdEncoding.DecodeString(string(v))
									if err != nil {
										return nil, err
									}
									if err := writeFile(ctx, dir, k, uid, gid, data); err != nil {
										return nil, err
									}
								}
								for k, v := range secret.Data {
									if err := writeFile(ctx, dir, k, uid, gid, []byte(v)); err != nil {
										return nil, err
									}
								}
								vol[v.Name] = dir
								break Secrets
							}
						}
					}

				case source.Secret != nil:
					secret, err := p.rm.GetSecret(source.Secret.Name, pod.Namespace)
					if source.Secret.Optional != nil && !*source.Secret.Optional && errors.IsNotFound(err) {
						return nil, fmt.Errorf("projected secret %s is required by pod %s and does not exist", source.Secret.Name, pod.Name)
					}
					if secret == nil {
						continue
					}

					dir, err := setupPaths(pod, secretDir, i)
					if err != nil {
						return nil, err
					}

					log.G(ctx).Infof("created %q for projected secret %q", dir, v.Name)

					for _, keyToPath := range source.ConfigMap.Items {
						for k, v := range secret.StringData {
							if keyToPath.Key == k {
								data, err := base64.StdEncoding.DecodeString(string(v))
								if err != nil {
									return nil, err
								}
								if err := writeFile(ctx, dir, keyToPath.Path, uid, gid, data); err != nil {
									return nil, err
								}
							}
						}
						for k, v := range secret.Data {
							if keyToPath.Key == k {
								if err := writeFile(ctx, dir, keyToPath.Path, uid, gid, []byte(v)); err != nil {
									return nil, err
								}
							}
						}
					}
					vol[v.Name] = dir

				case source.ConfigMap != nil:
					configMap, err := p.rm.GetConfigMap(source.ConfigMap.Name, pod.Namespace)
					if source.ConfigMap.Optional != nil && !*source.ConfigMap.Optional && errors.IsNotFound(err) {
						return nil, fmt.Errorf("projected configMap %s is required by pod %s and does not exist", source.ConfigMap.Name, pod.Name)
					}
					if configMap == nil {
						continue
					}

					dir, err := setupPaths(pod, configmapDir, i)
					if err != nil {
						return nil, err
					}

					log.G(ctx).Infof("created %q for projected configmap %q", dir, v.Name)

					for _, keyToPath := range source.ConfigMap.Items {
						for k, v := range configMap.Data {
							if keyToPath.Key == k {
								if err := writeFile(ctx, dir, keyToPath.Path, uid, gid, []byte(v)); err != nil {
									return nil, err
								}
							}
						}
						for k, v := range configMap.BinaryData {
							if keyToPath.Key == k {
								if err := writeFile(ctx, dir, keyToPath.Path, uid, gid, v); err != nil {
									return nil, err
								}
							}
						}
					}
					vol[v.Name] = dir

				}
			}

		default:
			return nil, fmt.Errorf("pod %s requires volume %s which is of an unsupported type", pod.Name, v.Name)
		}
	}

	return vol, nil
}

// mkdirAllChown calls os.MkdirAll and chown to create path and set ownership.
func mkdirAllChown(path string, perm os.FileMode, uid, gid string) error {
	if err := os.MkdirAll(path, perm); err != nil {
		return err
	}

	return chown(path, uid, gid)
}

// writeFile writes data in to a tmp file in dir and chowns it to uid/gid and
// then moves it over file. Note 'file': This mv fails for directories. Those need
// to be removed first? (This is not done yet)
func writeFile(ctx context.Context, dir, file, uid, gid string, data []byte) error {
	// var log = vklogv2.New(nil)
	// fnlog := log.
	// 	WithField("dir", dir).
	// 	WithField("file", file)

	tmpfile, err := ioutil.TempFile(dir, "vk.*.tmp")
	if err != nil {
		return err
	}
	// fnlog.Debugf("chowning %q to %s.%s", tmpfile.Name(), uid, gid)
	log.G(ctx).Infof("chowning %q to %s.%s", tmpfile.Name(), uid, gid)
	if err := chown(tmpfile.Name(), uid, gid); err != nil {
		return err
	}

	x := 10
	if len(data) < 10 {
		x = len(data)
	}
	// fnlog.Debugf("writing data %q to path %q", data[:x], tmpfile.Name())
	log.G(ctx).Infof("writing data %q to path %q", data[:x], tmpfile.Name())
	if err := ioutil.WriteFile(tmpfile.Name(), data, 0640); err != nil {
		return err
	}
	path := filepath.Join(dir, file)
	// fnlog.Debugf("renaming %q to %q", tmpfile.Name(), path)
	log.G(ctx).Infof("renaming %q to %q", tmpfile.Name(), path)

	return os.Rename(tmpfile.Name(), path)
}

// chown chowns name with uid and gid.
func chown(name, uid, gid string) error {
	// we're parsing uid/gid back and forth
	uidn, err := strconv.ParseInt(uid, 10, 64)
	if err != nil {
		uidn = -1
	}
	gidn, err := strconv.ParseInt(gid, 10, 64)
	if err != nil {
		gidn = -1
	}

	return os.Chown(name, int(uidn), int(gidn))
}

func cleanPodEphemeralVolumes(podId string) error {
	podEphemeralVolumes := filepath.Join(varrun, podId)
	return os.RemoveAll(podEphemeralVolumes)
}

func setupPaths(pod *v1.Pod, path string, s string) (string, error) {
	// id := string(pod.ObjectMeta.UID)
	uid, gid, err := uidGidFromSecurityContext(pod, 0)
	if err != nil {
		return "", err
	}
	dir := filepath.Join(varrun, pod.Namespace, pod.Name, path)
	if err := mkdirAllChown(dir, dirPerms, uid, gid); err != nil {
		return "", err
	}
	dir = filepath.Join(dir, s)
	if err := mkdirAllChown(dir, dirPerms, uid, gid); err != nil {
		return "", err
	}
	return dir, nil
}

const dirPerms = 02750
