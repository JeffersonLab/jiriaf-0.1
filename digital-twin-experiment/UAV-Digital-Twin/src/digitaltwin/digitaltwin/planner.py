import numpy as np
import matplotlib.pyplot as plt
import json

class Planner:
    def __init__(self, gm):
        self.gm = gm
        self.states = self.gm.config["flat_states"]
        self.controls = self.gm.config["controls"]
        self.gamma = self.gm.config["gamma"]


    def planning_reward(self, state, cidx):
        alpha1 = 1.0
        alpha2 = 2.5
        r = alpha1*self.state_reward_function(state, self.controls[cidx]) + alpha2*self.gm.control_reward_function(cidx)
        print(f"state_reward: {alpha1*self.state_reward_function(state, self.controls[cidx])}")
        print(f"control_reward: {alpha2*self.gm.control_reward_function(cidx)}")
        return r


    def state_reward_function(self, state, control):
        # wrapper function for gm.health_reward_function - gets the ref_obs corresponding to a state and control, then evaluates the health_reward for that ref_obs.
        ref_observation_dict = self.gm.config["observations"][str(state[0])][str(state[1])][control]
        R = 0
        for idx, ref_obs in enumerate(ref_observation_dict.values()):
            if idx > 0 and idx <= self.gm.n_samples:
                r = self.gm.health_reward_function(ref_obs)
                prob = 1./self.gm.n_samples
                R += prob*r
        return R


    def transition_probabilities_for_state_and_control(self, state1, control):
        T = []
        prob_sum = 0  # Initialize sum of probabilities for the current state1 and control
        temp_transitions = []  # Temporary list to store transitions for current state1 and control

        for state2 in self.states:
            d1 = state2[0] - state1[0]
            d2 = state2[1] - state1[1]
            p1 = self.gm.config["transition_probabilities"][control]
            p2 = self.gm.config["transition_probabilities"][control]

            if state1[0] == 80 and state1[1] == 80 and state2[0] == 80 and state2[1] == 80:
                prob = 1.0  # terminal state
            elif d1 == d2 == 0:
                prob = (1.-p1)*(1.-p2)
            elif d1 == 20 and d2 == 20:
                prob = p1*p2
            elif d1 == -20 and d2 == -20:
                prob = p1*p2  # Assign a larger probability for d1 and d2 == -20
            elif d2 < 0 or d1 < 0:
                prob = p1*p2*0.5
            elif d2 > 0 or d1 > 0:
                prob = p1*p2*0.5
            else:
                prob = 0.0

            prob_sum += prob  # Update the sum of probabilities
            temp_transitions.append([str(state1), control, str(state2), prob])

        # Normalize probabilities if the sum does not equal 1
        if prob_sum != 1.0:
            temp_transitions = [[trans[0], trans[1], trans[2], trans[3]/prob_sum] for trans in temp_transitions]

        # append only the probabilities to T
        for prob in temp_transitions:
            T.append(prob[3])
        return T


    # Value iteration algorithm to compute a policy
    def getPolicy(self):
        maxit = 100
        Ns = len(self.states)
        Nc = len(self.controls)

        V = np.zeros((Ns,maxit))
        v = np.zeros((Nc,1))
        for it in range(2,100):
            for sIdx, s in enumerate(self.states):
                for cIdx, c in enumerate(self.controls):
                    v[cIdx] = self.planning_reward(s,cIdx) + np.dot(np.transpose(V[:,it-1]),self.transition_probabilities_for_state_and_control(s, c))
                V[sIdx,it]  = self.gamma*np.max(v);
        V =  V[:,-1];

        Q  =  np.zeros((Ns,Nc));
        for sIdx, s in enumerate(self.states):
            for cIdx, c in enumerate(self.controls):
                Q[sIdx,cIdx] = self.planning_reward(s,cIdx) + np.dot(V,self.transition_probabilities_for_state_and_control(s, c))
                print("=====================================")
                print(f"state: {s}, control: {c}")
                print(f"planing_reward: {self.planning_reward(s,cIdx)}")
                print(f"t:{np.dot(V,self.transition_probabilities_for_state_and_control(s, c))}")

        print(f"Calculated Q for planning_reward: Q = {Q}")
        bestQ = np.max(Q,1)
        self.bestU = np.argmax(Q,1);

        ## optional:
        # self.plotPolicy(self.bestU)

        # print('Utility values for each state:')
        # print(list(zip(self.states, self.bestU)))


        # def qmdppolicy(belief): # multiplies belief by utility
        #     print(self.bestU)
        #     print(np.dot(belief.flatten(),self.bestU))
        #     return int(round(np.dot(belief.flatten(),self.bestU)))

        def mdppolicy(state):
            stateidx = self.states.index(state)
            return self.bestU[stateidx]

        print("Found a policy!")
        for state in self.states:
            print("State {}".format(state) + " is assigned control {}".format(self.controls[mdppolicy(state)]))
        return mdppolicy

    # plot the policy using matplotlib
    def plotPolicy(self, U):
            fig, ax = plt.subplots()
            pol = ax.imshow(U.reshape((5,5)).T,origin='lower')
            labels = ['0', '20', '40','60','80']
            plt.xlabel('Component 1 state')
            plt.ylabel('Component 2 state')
            ax.set_xticks([0,1,2,3,4])
            ax.set_yticks([0,1,2,3,4])
            ax.set_xticklabels(labels)
            ax.set_yticklabels(labels)

            cbar = fig.colorbar(pol, ax=ax, ticks=[0, 1])
            plt.show()
