FROM tiryoh/ros2:eloquent

# Add any additional setup commands you need here

# Update packages list
RUN apt-get update

# Install python packages
RUN apt-get install -y python3-dev graphviz libgraphviz-dev pkg-config
RUN apt-get install -y python3-pip

# Install python3-tk
RUN apt-get install -y python3-scipy
RUN apt-get install -y python3-tk

# Install specific python packages with pip
RUN pip3 install networkx==2.5

# Install pomegranate
RUN apt-get install -y cython3
RUN pip3 install pomegranate==0.13.0

# Install pygraphviz
RUN pip3 install pygraphviz==1.6

# Install x11-apps
RUN apt-get update
RUN apt-get install -y x11-apps


# source /opt/ros/eloquent/setup.bash
RUN echo "source /opt/ros/eloquent/setup.bash" >> /root/.bashrc