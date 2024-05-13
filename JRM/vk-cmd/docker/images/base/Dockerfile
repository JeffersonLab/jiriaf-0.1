
ARG BASE_IMAGE=debian:bullseye-slim
FROM $BASE_IMAGE as base

FROM --platform=$BUILDPLATFORM $BASE_IMAGE as go-build
COPY --chmod=0755 files/usr/local/bin/* /usr/local/bin/
COPY --chmod=0755 scripts/third_party/gimme/gimme /usr/local/bin/
# COPY --chmod=0755 scripts/target-cc /usr/local/bin/
RUN dpkg --add-architecture arm64 && dpkg --add-architecture amd64 \
    && clean-install bash ca-certificates curl git make pkg-config \
    crossbuild-essential-amd64 crossbuild-essential-arm64 \
    libseccomp-dev:amd64 libseccomp-dev:arm64

# print go version for debugging
ARG GO_VERSION
RUN echo "Building with go version: ${GO_VERSION}" # TODO: remove
RUN eval "$(gimme "${GO_VERSION}")" \
    && GOBIN=/usr/local/bin go install github.com/google/go-licenses@latest


FROM go-build as build-vk-cmd
ARG TARGETARCH GO_VERSION
ARG VK_CMD_REPO_URL="https://github.com/tsaie79/virtual-kubelet-cmd.git"
ARG VK_CMD_BRANCH="main"
RUN git clone -b "${VK_CMD_BRANCH}" "${VK_CMD_REPO_URL}" /vk-cmd \
    && cd /vk-cmd \
    && eval "$(gimme "${GO_VERSION}")" \
    && export GOARCH=$TARGETARCH \
    && go build -o bin/virtual-kubelet


# build final image layout from other stages
FROM base as build
# COPY --from=build-vk-cmd /vk-cmd/vk/vk-mock/docker/activate/* /vk-cmd/
COPY --from=build-vk-cmd /vk-cmd/bin/virtual-kubelet /vk-cmd/
COPY --chmod=0755 activate/* /vk-cmd/
RUN chmod +x /vk-cmd/start.sh

# how to bind a from host to b from container: docker run -it -v a:b IMAGE_NAME bash

# squash down to one compressed layer, without any lingering whiteout files etc
FROM scratch
# copy built binaries from build stage to final image layout and set entrypoint to virtual-kubelet binary by default (can be overridden)
COPY --from=build / /

ENTRYPOINT ["/bin/sh"]