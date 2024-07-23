#!/usr/bin/env python

import os
import rclpy
import numpy as np
import threading
from rclpy.node import Node
# import rospkg

from digitaltwin.msg import Sensor, SensorList
# reused from ros smach
from ament_index_python.resources import get_resource
# common imports that work for both versions PyQt4 and PyQt5
from python_qt_binding import loadUi, QT_BINDING_VERSION
from python_qt_binding.QtWidgets import QWidget, QFileDialog,QVBoxLayout
from rqt_gui_py.plugin import Plugin

import matplotlib
from matplotlib.backends.backend_qt5agg import FigureCanvas
from matplotlib.figure import Figure
from matplotlib import pyplot as plt
plt.rcParams.update({'font.size': 22})
plt.rcParams['svg.fonttype'] = 'none'

import pygraphviz
import tempfile

class ROSSensor(Plugin):

    def __init__(self, context):
        super(ROSSensor, self).__init__(context)
        self.setObjectName('ROSSensor')


        self._context = context
        self._node = context.node
        self._widget = SensorWidget(self._node)
        if context.serial_number() > 1:
            self._widget.setWindowTitle(self._widget.windowTitle() + (' (%d)' % context.serial_number()))
        context.add_widget(self._widget)

    def shutdown_plugin(self):
        self._widget.shutdown_plugin()

class SensorWidget(QWidget):
    def __init__(self, node):
        super(SensorWidget, self).__init__()
        layout = QVBoxLayout(self)
        self.static_canvas = FigureCanvas(Figure(figsize=(5, 3)))
        layout.addWidget(self.static_canvas)

        self.ax = self.static_canvas.figure.subplots()
        self.ax.set_xlim(0,100)
        self.ax.set_ylim(0,5)

        self.ax.set_title('Sensor Data')
        self.ax.set_xlabel('Time')
        self.ax.set_ylabel('Microstrain')
        self.ax.legend()
        self.ax.grid()

        self.sensor_data = []
        self.sensor_ref = None
        self._node = node
        self._node.create_subscription(Sensor, 'sensor_data', self.dataCallback, 10)
        self._node.create_subscription(SensorList, 'sensor_ref', self.refCallback, 10)


        # rclpy.spin_once(self._sub)
        #
        # # inform user that no graph has been received by drawing a single node in the rqt
        # self.gen_single_node('no dot received')


    def dataCallback(self, msg):
        # '''
        # updating figure
        # '''
        # # save graph in member variable in case user clicks save button later
        # clear the axis
        self.sensor_data.append(msg.data)
        if self.sensor_ref is not None:
            self.plot()

    def refCallback(self,msg):
        self.sensor_ref = msg.datas

    def plot(self):

        self.ax.clear()
        idxstoplot = [0]
        colors = ['r', 'g', 'b', 'm', 'c']

        self.types = [s.type for s in self.sensor_ref]
        n_estimates = sum(1 if t==1. else 0 for t in self.types)
        xx = range(0,len(self.sensor_data))
        xxref = range(0,len(self.sensor_ref))
        print(f"n_estimates: {n_estimates}, xx: {xx}, xxref: {xxref}")
        for i, idx in enumerate(idxstoplot):
            print(f"idx: {idx} \n i: {i} \n sensor_data: {self.sensor_data} \n ref: {self.sensor_ref}")
            self.ax.scatter(xx, [s[idx] for s in self.sensor_data], s=20, c='black', label='Observed Lq')
            mean_estimate = [s.data[idx] for s in self.sensor_ref[:n_estimates]]
            vars_estimate =  [s.vars[idx] for s in self.sensor_ref[:n_estimates]]
            ci_estimate = 2*np.sqrt(vars_estimate) #2 stddevs

            mean_predict = [s.data[idx] for s in self.sensor_ref[n_estimates-1:]]
            vars_predict =  [s.vars[idx] for s in self.sensor_ref[n_estimates-1:]]
            ci_predict = 2*np.sqrt(vars_predict) #2 stddevs

            # self.ax.plot(xxref[:n_estimates], mean_estimate, 'b-', linewidth=2, label='Estimated Lq')
            # self.ax.fill_between(xxref[:n_estimates], np.array(mean_estimate)-ci_estimate, np.array(mean_estimate)+ci_estimate, color='b', alpha=.1)

            # self.ax.plot(xxref[n_estimates-1:], mean_predict, 'r--', linewidth=2, label='Predicted Lq')
            # self.ax.fill_between(xxref[n_estimates-1:], np.array(mean_predict)-ci_predict, np.array(mean_predict)+ci_predict, color='r', alpha=.1)

        self.ax.set_xlim(0,100)
        # self.ax.set_ylim(0,10)

        self.ax.set_title('Observed vs Estimated Queue Length')
        self.ax.set_xlabel('Time')
        self.ax.set_ylabel('Queue Length Lq')
        self.ax.legend(fontsize=8)
        self.ax.grid()
        # if n_estimates == 30:

        #make all fonts smaller
        for item in ([self.ax.title, self.ax.xaxis.label, self.ax.yaxis.label] +
                        self.ax.get_xticklabels() + self.ax.get_yticklabels()):
                item.set_fontsize(8)

        from datetime import datetime
        self.log_fpath = "/workspaces/UAV-Digital-Twin/src/digitaltwin/outputfiles/"
        self.log_fpath = self.log_fpath + datetime.now().strftime('%m%d_T%H') + '/'
        os.makedirs(self.log_fpath, exist_ok=True)

        self.static_canvas.figure.set_size_inches(6, 4)
        self.static_canvas.figure.savefig(self.log_fpath + "sensor_plot.pdf", format='pdf',transparent=False)
        self.static_canvas.draw_idle()

    def _handle_refresh_clicked(self, checked):
        '''
        called when the refresh button is clicked
        '''
        # self._sub = FigSub(self,self.topicText.text())
        pass

    # Qt methods
    def shutdown_plugin(self):
        pass

    def save_settings(self, plugin_settings, instance_settings):
        pass

    def restore_settings(self, plugin_settings, instance_settings):
        pass
