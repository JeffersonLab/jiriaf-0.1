import random
import datetime

labels= ['Job ID','Workflow','Creator','Status','Created','Run','Compute Resource','Tags']
jobs= []

random.seed(3)
d = datetime.date(1970, 1, 1)

for i in list(range(20)):
    job= []

    if True:
        job+= [str(10000+random.randint(0,10000))]
        job+= [' ']
        job+= [' ']
        job+= [['Waiting','Running','Completed'][random.randint(0,2)]]
        job+= [d.strftime('%m/%d/%Y')]
        job+= [(d + datetime.timedelta(days= random.randint(1,100))).strftime('%m/%d/%Y')]
        job+= [['JLab','NERSC'][random.randint(0,1)]]
        job+= [' ']

    jobs+= [job]

with open('output.txt', 'w') as f:
    for i in jobs:
        for j in i:
            f.write(j)
            f.write(',')
        f.write('\n')