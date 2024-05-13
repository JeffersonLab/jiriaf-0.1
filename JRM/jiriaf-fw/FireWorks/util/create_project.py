import os
from monty.serialization import loadfn, dumpfn
import sys

def create_fworker(proj, category):
    path = '/fw/util/projects/{}'.format(proj)
    os.makedirs(os.path.join(path, category), exist_ok=True)
    f = loadfn("my_fworker.yaml")
    q = loadfn("my_qadapter.yaml")
    l  = loadfn("my_launchpad.yaml")

    f.update({"category":category})
    q.update({"rocket_launch":"rlaunch -c {} singleshot".format(os.path.join(path, category))})
    l.update({"name":proj})

    dumpfn(f, os.path.join(path, category, "my_fworker.yaml"))
    dumpfn(q, os.path.join(path, category, "my_qadapter.yaml"))
    dumpfn(l, os.path.join(path, category, "my_launchpad.yaml"))

    os.makedirs(os.path.join("/fw/util/scratch",  proj), exist_ok=True)

create_fworker(sys.argv[1], sys.argv[2])


#qlaunch -c /home/j.tsai/config/project/defect_qubit_in_36_group/charge_state/ -r rapidfire -m 10