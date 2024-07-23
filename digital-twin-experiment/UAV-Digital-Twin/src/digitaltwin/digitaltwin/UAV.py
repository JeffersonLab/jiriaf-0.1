import numpy as np
import scipy as sp
import scipy.interpolate
from itertools import product

from digitaltwin.utils import *

class UAV():
    def __init__(self, config_fpath='./src/digitaltwin/inputfiles/UAVconfig.json'):
        self.config = read_json_file(config_fpath)
        self.measurementGenerator = measurementGenerator(self.config["states"], self.config["controls"], self.config["observations"])

class measurementGenerator():
    def __init__(self,  states, controls, observations, noise = None):
        self.states = states
        self.controls = controls
        self.observations = observations
        self.noise = noise if noise is not None else noiseParams()

    def getMeasurement(self, stateIdx, controlIdx, noisy = False, type = 'linear'):
        # Choose the interpolation type
        if type is 'linear':
            # Create coordinate pairs
            lists = [range(0,len(self.states[0])), range(0,len(self.controls))]
            coord = list(product(*lists))
            print(f"coord: {coord}")
            # create data matrix
            data = []
            for state1, control in coord:
                data.append(self.observations[str(self.states[0][state1])][str(self.states[1][state1])][self.controls[control]]["mean"])
            print(f"data: {data}")
            # Create interpolator object
            interp = scipy.interpolate.LinearNDInterpolator(coord, data) # Interpolation object for linear interpolation of data points

        else:
            print('Error: Unknown interpolation type:'+str(type))

        # Generate clean measurement
        cleanmeasurement = interp(stateIdx[0], controlIdx)[0]
        print(f"Interpolated measurement: {cleanmeasurement} at state {stateIdx} and control {controlIdx}")
        noisymeasurement = cleanmeasurement
        if noisy:
            # Add artificial noise to measurement
            if self.noise.type is "Gaussian":
                noise = np.random.normal(self.noise.mean, self.noise.sigma,cleanmeasurement.shape)
                noisymeasurement = cleanmeasurement+noise
                noisymeasurement = noisymeasurement.clip(min=1)
            else:
                noisymeasurement = cleanmeasurement

        # normalize data by load factor
        if self.controls[controlIdx[0]] == '32c':
            cleanmeasurement = [x for x in cleanmeasurement]
            noisymeasurement = [x for x in noisymeasurement]
        elif self.controls[controlIdx[0]] == '16c':
            cleanmeasurement = [x for x in cleanmeasurement]
            noisymeasurement = [x for x in noisymeasurement]
        if noisy:
            return noisymeasurement
        else:
            return cleanmeasurement

class noiseParams():
    def __init__(self, type = "Gaussian", sigma=0.01):
        self.type = type
        self.mean = 0
        self.sigma = sigma
