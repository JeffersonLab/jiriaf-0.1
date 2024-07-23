#!/usr/bin/env python3
import rclpy
import time
import numpy as np
import time
from rclpy.node import Node

from std_msgs.msg import String
from digitaltwin.msg import Sensor, State, ControlA, StateList
from digitaltwin.UAV import UAV

class Asset(Node):
    def __init__(self):
        super().__init__('uav_asset')
        ## UAV Properties
        self.UAV = UAV()
        self.truestate = [0.,0.]
        self.state_transition = 'j'
        self.truestate_hist = [[],[]]
        self.truestate_hist[0].append(self.truestate[0])
        self.truestate_hist[1].append(self.truestate[1])
        self.types = []
        self.types.append(0)
        self.control = [0]

        ## Sensor Data publisher
        self.sensor_publisher = self.create_publisher(Sensor, 'sensor_data', 10)

        ## True state publisher
        self.state_publisher = self.create_publisher(StateList,'state_truth', 10)

        # timer_period = 5.0  # seconds
        # self.timer = self.create_timer(timer_period, self.publish_sensor_data)

        self.timestep = -1

        ## Control Input Subscriber
        self.listener = self.create_subscription(ControlA, 'control_data', self.control_callback, 100)
        self.listener  # prevent unused variable warning

        self.state_list_msg = StateList()
        self.state_list_msg.states = []
        state_msg = State()
        state_msg.state1 = [self.truestate[0]]
        state_msg.state2 = [self.truestate[1]]
        state_msg.joint = []
        state_msg.type = 0
        self.state_list_msg.states.append(state_msg)

        # time.sleep(2)
        # self.publish_sensor_data()

    def publish_sensor_data(self):
        # strain = np.random.rand(24,1).astype('float64')
        strain = self.UAV.measurementGenerator.getMeasurement(self.truestate,self.control) # this strain is normalized cleanmeasurement + noise
        sensor_msg = Sensor()
        sensor_msg.type = 0
        sensor_msg.data = strain
        self.sensor_publisher.publish(sensor_msg)
        self.get_logger().info('Asset published sensor data for timestep {} : {}'.format(self.timestep, sensor_msg.data))
        print(f"Generating sensor data for {self.truestate} and {self.control}, strain: {strain}")

    def publish_state_data(self):
        print(f"truestate: {self.truestate}")
        self.timestep += 1
        if self.state_transition == 'linear':
            if self.control[0] == 0:
                self.truestate[0] += 4./100
                self.truestate[1] += 4./100
            else:
                self.truestate[0] += 4./100
                self.truestate[1] += 4./100
        elif self.state_transition == 'custom':
            if self.timestep in [20, 30]:  # 20, 30
                print(f"triggered truestate[0] + 1", self.timestep)
                self.truestate[0] += 1
            if self.timestep >= 10 and self.timestep < 20: # 10, 11, 12, 13, 14, 15, 16, 17, 18, 19
                print(f"triggered truestate[0] + 0.1", self.timestep)
                self.truestate[0] += 0.1

            if self.timestep in [5, 25]: # 5, 25
                print(f"triggered truestate[1] + 1" , self.timestep)
                self.truestate[1] += 1
            if self.timestep >= 5 and self.timestep < 15: # 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
                print(f"triggered truestate[1] + 0.1", self.timestep)
                self.truestate[1] += 0.1

        elif self.state_transition == 'piecewise':
            if (self.timestep-20 % 25) == 0:
                self.truestate[0] += 1.
            if ((self.timestep-20) % 25) == 0:
                self.truestate[1] += 1.
        elif self.state_transition == 'stochastic':
            u1 = np.random.rand()
            u2 = np.random.rand()
            p1 = 0.1
            p2 = 0.1
            if u1 > (1.-p1):
                self.truestate[0] += 1.
            if u2 > (1.-p2):
                self.truestate[1] += 1.
        elif self.state_transition == 'j':
            # self.truestate[0] = 2.
            # self.truestate[1] = 2.
            increment = 0.4
            if self.timestep < 10:
                self.truestate[0] += increment
                self.truestate[1] += increment
            elif self.timestep > 20 and self.timestep < 30:
                self.truestate[0] -= increment
                self.truestate[1] -= increment
            elif self.timestep > 40 and self.timestep < 50:
                self.truestate[0] += increment
                self.truestate[1] += increment
            elif self.timestep > 60 and self.timestep < 70:
                self.truestate[0] -= increment
                self.truestate[1] -= increment
            elif self.timestep > 80 and self.timestep < 90:
                self.truestate[0] += increment
                self.truestate[1] += increment
            elif self.timestep > 100 and self.timestep < 110:
                self.truestate[0] -= increment
                self.truestate[1] -= increment
        
        elif self.state_transition == 'constant':
            self.truestate[0] = 2.
            self.truestate[1] = 2.



    
            # No else clause needed for the period from 16 to 30 as no changes are made
                

        
        self.truestate_hist[0].append(self.truestate[0])
        self.truestate_hist[1].append(self.truestate[1])
        self.types.append(0)
        state_msg = State()
        state_msg.state1 = [self.truestate[0]]
        state_msg.state2 = [self.truestate[1]]
        state_msg.joint = []
        state_msg.type = 0
        self.state_list_msg.states.append(state_msg)
        self.state_publisher.publish(self.state_list_msg)

    def control_callback(self, msg):
        self.control = msg.data
        print(f"Ground truth: {self.truestate}, control: {self.control}")
        if self.truestate[0] < 4. and self.truestate[1] < 4.: # if mission is over, do not publish another sensor measurement (*should* mean nothing more happens...)
            time.sleep(5)
            self.publish_sensor_data()
            self.publish_state_data()

def main(args=None):
    rclpy.init(args=args)
    uav_asset = Asset()

    try:
        rclpy.spin(uav_asset)
    except KeyboardInterrupt:
        # Destroy the node explicitly
        # (optional - otherwise it will be done automatically
        # when the garbage collector destroys the node object)
        uav_asset.destroy_node()
        rclpy.shutdown()

    # Destroy the node explicitly
    # (optional - otherwise it will be done automatically
    # when the garbage collector destroys the node object)
    # uav_asset.destroy_node()
    # rclpy.shutdown()

if __name__ == '__main__':
    main()
