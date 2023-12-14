#!/usr/bin/env python
#
# Submit jobs to run at NERSC via swif2
#
# See more detailed documentation here:
#  https://halldweb.jlab.org/wiki/index.php/HOWTO_Execute_a_Launch_using_NERSC
#
# This will run commands submitting several recon jobs
# with the run/file numbers hardcoded into this script.
# Here is how this is supposed to work:
#
# This will run swif2 with all of the SBATCH(slurm) options
# passed via command line. This includes the shifter image
# that should be used. swif2 will then take care of getting
# the file from tape and transferring it to NERSC. Once
# the file is there, it will submit the job to Cori.
#
# When the job wakes up, it will be in a subdirectory of the
# NERSC scratch disk that swif2 has already setup.
# This directory will contain a symbolic link pointing
# to the raw data file which is somewhere else on the scratch
# disk.
#
# The container will run the /launch/script_nersc.sh script
# where /launch has been mounted in the container from the
# "launch" directory in the project directory. The jana
# config file is also kept in the launch directory.
#
# The container will also have /cvmfs mounted. The standard
# gluex containers have links built in so that /group will
# point to the appropriate subdirectory of /cvmfs making the
# the GlueX software available. The script_nersc.sh script
# will use this to setup the environment and then run hd_root
# using the /launch/jana_recon_nersc.config file.
#
# A couple of more notes:
#
# 1. The CCDB and RCDB used comes from an sqlite file in
# CVMFS. These are copied to the local node in /dev/shm at
# the beginning of the job and deleted at the end. The
# timestamp used is hardcoded in /launch/jana_recon_nersc.config
#
# 2. NERSC requires that the program being run is actually
# a script that starts with #!/XXX/YYY . It is actually a
# SLURM script where additional SLURM options could be set.
# We do not put them there though. All SLURM options are
# passed via the sbatch command swif2 runs and that we specify
# here. The /launch/script_nersc.sh script is trivial and only
# runs shifter passing any arguments we give to it here in
# the swif2 command.
#
# 3. The output directory is created by this script
# to allow group writing since the files are copied using
# the davidl account on globus but swif2 is being run from
# the gxproj4 account.
#
#
# ----------------------------------------------------------------
#
# JOB SPLITTING
# --------------
# To make individual NERSC jobs smaller so that they better
# take advantage of the backfill mechanism, they can be split
# into multiple jobs that each process only one part of the
# raw data file. This is controlled by the SPLIT_JOBS global.
# If that is set to true, then the processing of a single file 
# is split into smaller jobs that process up to EVENTSPERJOB
# physics events each. At the time each file's job is made,
# the number of events in the file is found in the HOSS database.
# If it is more than EVENTSPERJOB, the job is split into multiple
# jobs automatically. One extra job is also submitted that 
# depends on all of the others so it can aggregate the outputs
# back into a single set of output files.
#
# Thus, it is entirely possible for most of the files in a run
# to be split into multiple jobs while the last file(s) (which
# contain(s) fewer events) will not be split, and thus not use an
# aggregation job.
#
# It should be noted that the actual splitting is done on physics 
# event blocks (typically 40 L1 trigger events). The number of
# events per block is set in the EVENTSPERBLOCK variable. The
# mechanism for skipping blocks only skips physics events so
# BOR and EPICS are still processed (unlike the generic JANA
# mechanism which doesn't consider event flavor).
#
# The time limits for the split jobs and aggregator jobs are
# set by the TIMELIMIT_SPLIT and TIMELIMIT_AGGREGATOR globals.
# Pay special attention to these since all should be adjusted
# depending on the value of EVENTSPERJOB and the rate at
# which the current code runs. 
#
# WHOLE JOB FALLBACK
# -------------------
# The HOSS DB may be incomplete (there are definitely files 
# missing for RunPeriod-2019-11). In these cases, a fallback
# mechanism is available to allow those files to be submitted
# as whole file jobs. Whether this is done or not is determined
# by the SUBMIT_WHOLE_FILE_IF_HOSS_MISSING flag set below.
# Note that the time limits for these are determined by the
# TIMELIMIT value.
#
# ----------------------------------------------------------------
#
# For the recon_2018-08_ver00 launch, the data were separated into
# separate batches following the boundaries defined here:
# https://halldweb.jlab.org/wiki-private/index.php/Fall_2018_Dataset_Summary
#
# BATCH 1: 50677-51035
# BATCH 2: 51036-51203
# BATCH 3: 51204-51383
# BATCH 4: 51497-51638, 51683-51687, 51722-51768
#
# Number of jobs by batch:
# BATCH 1: 14833
# BATCH 2: 12154
# BATCH 3:  9835
# BATCH 4: 10363 = 8373+189+1801

import subprocess
import math
import glob
import sys
import os

# mysql.connector not available via system and must come via PYTHONPATH
if not os.getenv('PYTHONPATH') : sys.path.append('/group/halld/Software/builds/Linux_CentOS7-x86_64-gcc4.8.5/ccdb/ccdb_1.06.06/python')
import mysql.connector


#TESTMODE       = True  # True=only print commands, but don't actually submit jobs
TESTMODE       = False  # True=only print commands, but don't actually submit jobs
VERBOSE        = 1     # 1 is default
RUNPERIOD      = '2019-11'
LAUNCHTYPE     = 'recon'  # 'offmon' or 'recon' 
VER            = '01'
BATCH          = '01c'
WORKFLOW       = LAUNCHTYPE+'_'+RUNPERIOD+'_ver'+VER+'_batch'+BATCH
NAME           = 'GLUEX_' + LAUNCHTYPE

#RCDB_QUERY     = '@is_2018production and @status_approved'  # Comment out for all runs in range MINRUN-MAXRUN
RCDB_QUERY     = '@is_dirc_production and @status_approved' # Comment out for all runs in range MINRUN-MAXRUN
RUNS           = []      # List of runs to process. If empty, MINRUN-MAXRUN are searched in RCDB
EXCLUDE_RUNS   = []      # Runs that should be excluded from processing
MINRUN         = 71406   # If RUNS is empty, then RCDB queried for this range
MAXRUN         = 71470   # If RUNS is empty, then RCDB queried for this range
MINFILENO      = 0       # Min file number to process for each run (n.b. file numbers start at 0!, set to e.g. 1000 to process all files)
MAXFILENO      = 1000    # Max file number to process for each run (n.b. file numbers start at 0!)
FILE_FRACTION  = 1.0     # Fraction of files to process for each run in specified range (see GetFileNumbersToProcess)
SPLIT_JOBS     = True    # Allow jobs to be split based on EVENTSPERJOB (see note above on splitting)
EVENTSPERJOB   = 175000  # Maximum events to process per job (see note above on splitting)
EVENTSPERBLOCK = 40      # Number of physics events in a block. This has always been 40 for GlueX data
SUBMIT_WHOLE_FILE_IF_HOSS_MISSING = True # If jobs are being split, but the event count for a file is missing, submit whole file as single job.

MAX_CONCURRENT_JOBS = '2100'  # Maximum number of jobs swif2 will have in flight at once (based on scratch disk space at NERSC)
PROJECT        = 'm3120'
TIMELIMIT      = '10:50:00' # time limit for full file jobs on KNL
TIMELIMIT_SPLIT= '01:35:00' # time limit for split jobs on KNL
TIMELIMIT_AGGREGATOR = '00:25:00' # Set time limit for aggregator script (only used if job is split)
QOS            = 'regular'  # debug, regular, premium, low, flex, scavenger 
QOS_SPLIT      = 'regular'     # used only for split jobs (SPLIT_JOBS=True)
NODETYPE       = 'knl'      # haswell, knl  (quad,cache)
SPLIT_SCRATCH  = '/global/cscratch1/sd/jlab/split_jobs'  # top-level directory where split job output should be placed

IMAGE          = 'docker:markito3/gluex_docker_devel'
#RECONVERSION   = 'halld_recon/halld_recon-recon-2018_08-ver02'  # must exist in /group/halld/Software/builds/Linux_CentOS7-x86_64-gcc4.8.5-cntr
RECONVERSION   = 'halld_recon/halld_recon-4.19.0'  # must exist in /group/halld/Software/builds/Linux_CentOS7-x86_64-gcc4.8.5-cntr
#RECONVERSION   = 'halld_recon/halld_recon-4.16.2'  # must exist in /group/halld/Software/builds/Linux_CentOS7-x86_64-gcc4.8.5-cntr
#RECONVERSION   = 'version_4.21.1.xml'

SCRIPTFILE     = '/launch/script_nersc.sh'
AGGREGATOR_SCRIPTFILE = '/launch/script_nersc_aggregator.sh'
CONFIG         = '/launch/jana_'+LAUNCHTYPE+'_nersc.config'

HOSS_HOST    = 'hallddb-a.jlab.org'
HOSS_USER    = 'hoss'
HOSS         = None
RCDB_HOST    = 'hallddb.jlab.org'
RCDB_USER    = 'rcdb'
RCDB         = None
BAD_RCDB_QUERY_RUNS = []  # will be filled with runs that are missing evio_file_count field in RCDB query
BAD_FILE_COUNT_RUNS = []  # will be filled with runs where number of evio files could not be obtained by any method
BAD_EVNT_COUNT_RUNS = {}  # will be filled with runs/files where the event count was not obtained from HOSS
BAD_MSS_FILE_RUNS   = {}  # will be filled with runs/files where the stub file in /mss is missing

# Set output directory depending on launch type
if   LAUNCHTYPE=='offmon':
	OUTPUTTOP      = 'mss:/mss/halld/halld-scratch/offline_monitoring/RunPeriod-'+RUNPERIOD+'/ver'+VER  # prefix with mss: for tape or file: for filesyste
#	OUTPUTTOP      = 'mss:/mss/halld/offline_monitoring/RunPeriod-'+RUNPERIOD+'/ver'+VER  # prefix with mss: for tape or file: for filesyste
elif LAUNCHTYPE=='recon':
	OUTPUTTOP      = 'mss:/mss/halld/halld-scratch/RunPeriod-'+RUNPERIOD+'/recon/ver'+VER
else:
	print 'Unknown launch type "'+LAUNCHTYPE+'"! Don\'t know where to put output files!'
	sys.exit(-1)

#----------------------------------------------------
def MakeJob(RUN,FILE,NEVENTS):

	global NUM, DIRS_CREATED

	EVIOFILE  = 'hd_rawdata_%06d_%03d.evio' % (RUN, FILE)
	MSSFILE   = '/mss/halld/RunPeriod-%s/rawdata/Run%06d/%s' % (RUNPERIOD, RUN, EVIOFILE)
	
	# Verify stub file exists before submitting job
	if not os.path.exists( MSSFILE ):
		if RUN not in BAD_MSS_FILE_RUNS.keys(): BAD_MSS_FILE_RUNS[RUN] = []
		BAD_MSS_FILE_RUNS[RUN].append(FILE)
		return

	NUM['files_submitted'] += 1
	
	# The OUTPUTDIR variable is a fully qualified path used to pre-create
	# the output directories for the job files. If the files are going to
	# /mss, then we must replace the mss:/mss part at the beginning with
	# /lustre/expphy/cache. Otherwise, just use the path as given in OUTPUTTOP
	OUTPUTDIR = OUTPUTTOP.split(':',1)[1]  # just directory part
	if OUTPUTTOP.startswith('mss:/mss'): OUTPUTDIR = OUTPUTDIR.replace('/mss','/lustre/expphy/cache')
	
	# Get list of output file names and mappings to final directory and file name.
	# The outfiles variable is a map of local file(key) to output file with path(value)
	# The path is relative to the OUTPUTDIR directory.
	if LAUNCHTYPE == 'recon':
		outfiles = ReconOutFiles(RUN, FILE)
	elif LAUNCHTYPE == 'offmon':
		outfiles = OffmonOutFiles(RUN, FILE)
	else:
		print 'Unknown launch type (' + LAUNCHTYPE + ')! Unable to form output file list'

	# Get list of output directories so we can pre-create them with proper 
	# permissions. Normally, we wouldn't have to make the directories, but if using
	# a Globus account with a different user than the one running swif2,
	# there will be permissions errors otherwise.
	outdirs = []
	for (infile, outpath) in outfiles.iteritems():
		if infile.startswith('match:'):  # If using wildcards, the outputpath already is the output directory
			outdirs.append(outpath)
		else:
			outdirs.append(os.path.dirname(outpath))

	# Pare down list of outdirs to only those that don't already exist
	new_outdirs = [x for x in outdirs if x not in DIRS_CREATED]
	
	# Set umask to make directories group writable (but not world writable)
	os.umask(0002)
	
	# Create output directories at JLab
	for d in new_outdirs:
		mydir = OUTPUTDIR + '/' + d
		if not os.path.exists(mydir) :
			if VERBOSE > 1: print('mkdir -p ' + mydir)
			if not TESTMODE: 
				os.makedirs(mydir)
				DIRS_CREATED.append(mydir)

	# Split into multiple jobs:
	#
	# If the global SPLIT_JOBS parameter is True, then we will try and
	# split the processing of this file into multiple jobs. There are
	# a few ways, however, that this file may need to be processed as
	# a "whole file" job:
	# 
	# 1. Global configuration sets SPLIT_JOBS = False
	# 2. Number of events in file is few enough to use split file parameters
	# 3. Event count info not available from HOSS so file must be
	#    processed in single, large job.
	#
	# In the case of 2., the job should not use the split file parameters
	# unless SPLIT_JOBS=True since the user may not have set the split
	# file parameters correctly assuming all files will be processed as
	# single jobs.


	# Determine how many jobs we need to split this file into
	NBLOCKS = int(math.ceil(float(NEVENTS)/float(EVENTSPERBLOCK)))
	BLOCKSPERJOB = int(math.ceil(float(EVENTSPERJOB)/float(EVENTSPERBLOCK)))
	NJOBS = 1
	if SPLIT_JOBS:
		while (NJOBS*BLOCKSPERJOB) < NBLOCKS: NJOBS += 1

	# Decide whether to use the split job parameters (smaller) or whole 
	# file parameters (larger)
	use_split_parms = SPLIT_JOBS
	if NEVENTS==0 : use_split_parms = False  # No event count in HOSS DB

	# This is only used if the job is split. It is the top-level
	# directory for split job outputs will be copied and where the
	# secondary job will be run
	OUTDIR_SPLIT = SPLIT_SCRATCH + '/JOBS_%06d_%03d' % (RUN, FILE)
	
	# Use different time limit depending on whether it's a split job or not
	# If NEVENTS=0 that means we don't know how many events are in the file 
	# so need to use the whole file time limit.	
	if use_split_parms : 
		timelimit = TIMELIMIT_SPLIT
		qos       = QOS_SPLIT
	else:
		timelimit = TIMELIMIT
		qos       = QOS

	# If using the "flex" QOS, then set time to be just over 2 hours
	# (as required by the flex queue) and set the min-time to be the
	# actual max time.
	min_time = timelimit
	if qos == 'flex': timelimit = '2:00:01' 

	# SLURM options
	SBATCH  = ['-sbatch']
	SBATCH += ['-A', PROJECT]
	SBATCH += ['--volume="/global/project/projectdirs/%s/launch:/launch"' % PROJECT]
	SBATCH += ['--image=%s' % IMAGE]
	SBATCH += ['--time=%s' % timelimit]
	SBATCH += ['--time-min=%s' % min_time]  # This should only be used for flex QOS
	SBATCH += ['--nodes=1']
	SBATCH += ['--tasks-per-node=1']
	SBATCH += ['--cpus-per-task=64']
	SBATCH += ['--qos='+qos]
	SBATCH += ['-C', NODETYPE]
	SBATCH += ['-L', 'project']

	# Loop over all jobs
	JOB_NAMES = []
	for ijob in range(0, NJOBS):

		# SWIF2 job name
		JOB_STR   = '%s_%06d_%03d' % (NAME, RUN, FILE)
		if NJOBS > 1 : JOB_STR += '_part%02d' % ijob
		JOB_NAMES.append( JOB_STR ) # will be used for specifying dependencies if split job

		# Command for job to run
		CMD  = ['/global/project/projectdirs/%s/launch/run_shifter.sh' % PROJECT]
		CMD += ['--module=cvmfs']
		CMD += ['--']
		CMD += [SCRIPTFILE]
		CMD += [CONFIG]           # arg 1:  JANA config file
		CMD += [RECONVERSION]     # arg 2:  sim-recon version
		CMD += [str(RUN)]         # arg 3:  run     <--+ run and file number used to name job_info
		CMD += [str(FILE)]        # arg 4:  file    <--+ directory only.

		# Make swif2 command
		SWIF2_CMD  = ['swif2']
		SWIF2_CMD += ['add-job']
		SWIF2_CMD += ['-workflow', WORKFLOW]
		SWIF2_CMD += ['-name', JOB_STR]
		SWIF2_CMD += ['-input', EVIOFILE, 'mss:'+MSSFILE]
		
		# A bug in swif2 causes it to give a SWIF_MISSING_INPUT error for all
		# subsequent jobs after the first. A work-around suggested by Chris
		# is to make all other jobs depend on the first. This does introduce 
		# what might be another unneccesary delay, but should only be the length
		# of the first job.
		if len(JOB_NAMES) >= 2:
			SWIF2_CMD += ['-antecedent', JOB_NAMES[0]]
		
		if NJOBS > 1 :
			# Split job. Give additional arguments for range of events
			# and directory to copy results into on NERSC scratch.
			myoutdir = OUTDIR_SPLIT + '/split%02d' % ijob
			CMD += [str(ijob*BLOCKSPERJOB)]   # arg 5:  Nphysics_event_blocks to skip
			CMD += [str(BLOCKSPERJOB)]        # arg 6:  Nphysics_event_blocks to keep (i.e. process)
			CMD += [myoutdir]                 # arg 7:  Output directory to copy split job's outputs to
		else :
			# Not a split job. Add the output file list to the swif2 command
			for src,dest in outfiles.iteritems(): SWIF2_CMD += ['-output', src, OUTPUTTOP + '/' + dest]
		
		# Add SBATCH options and actual command to run to swif2 command		
		SWIF2_CMD += SBATCH + ['::'] + CMD

		# Print command
		if VERBOSE > 2 : print( ' '.join(SWIF2_CMD) )
		elif VERBOSE > 1 : print( ' --- Job will be created for run:' + str(RUN) + ' file:' + str(FILE) )
		NUM['jobs_to_process'] += 1
		if NJOBS > 1: NUM['split_jobs_to_process'] += 1
		if not TESTMODE:
			subprocess.check_call(SWIF2_CMD)
			NUM['jobs_submitted'] += 1
			if NJOBS > 1: NUM['split_jobs_submitted'] += 1

	# If job is split into multiple jobs, add another aggregator
	# job to merge output files and pull them back to JLab.
	if NJOBS > 1 :
		# SWIF2 job name
		JOB_STR   = '%s_%06d_%03d_aggregator' % (NAME, RUN, FILE)

		# Command for aggregator job
		CMD  = ['/global/project/projectdirs/%s/launch/run_shifter.sh' % PROJECT]
		CMD += ['--module=cvmfs']
		CMD += ['--']
		CMD += [AGGREGATOR_SCRIPTFILE]
		CMD += [RECONVERSION]     # arg 1:  sim-recon version
		CMD += [str(RUN)]         # arg 2:  run
		CMD += [str(FILE)]        # arg 3:  file
		CMD += [OUTDIR_SPLIT]     # arg 4:  top-level directory where split job's outputs are

		# Make swif2 command
		SWIF2_CMD  = ['swif2']
		SWIF2_CMD += ['add-job']
		SWIF2_CMD += ['-workflow', WORKFLOW]
		SWIF2_CMD += ['-name', JOB_STR]
		
		# Add dependency of this job on all primary jobs
		for primary_job_name in JOB_NAMES:
			SWIF2_CMD += ['-antecedent', primary_job_name]
		
		# Add the output file list to the swif2 command
		# n.b. the script_nersc_aggregator.sh script
		# will create the merged files in the working
		# directory of the aggregator job.
		for src,dest in outfiles.iteritems():
			SWIF2_CMD += ['-output', src, OUTPUTTOP + '/' + dest]
		
		# Add SBATCH options and actual command to run to swif2 command		
		SWIF2_CMD += SBATCH + ['::'] + CMD
		
		# The timelimit set in SBATCH is for primary jobs which is longer
		# than we need. Set the timelimit for aggregator jobs to something
		# smaller.
		# Note that if running in the flex queue then set the --min-time argument
		time_arg = '--time='
		if qos == 'flex': time_arg = '--time-min=' 
		time_arg_small = time_arg + TIMELIMIT_AGGREGATOR
		SWIF2_CMD = [time_arg_small if x.startswith(time_arg) else x for x in SWIF2_CMD]
		if qos != 'flex' : SWIF2_CMD = [x for x in SWIF2_CMD if not x.startswith('--time-min=')]  # remove --time-min argument completely for non-flex queue jobs

		# Print command
		if VERBOSE > 2 : print( ' '.join(SWIF2_CMD) )
		elif VERBOSE > 1 : print( ' --- Job will be created for run:' + str(RUN) + ' file:' + str(FILE) )
		NUM['jobs_to_process'] += 1
		NUM['aggregator_jobs_to_process'] += 1
		if not TESTMODE:
			subprocess.check_call(SWIF2_CMD)
			NUM['jobs_submitted'] += 1
			NUM['aggregator_jobs_submitted'] += 1

#----------------------------------------------------
def OffmonOutFiles(RUN, FILE):

	# WARNING: Additions here need to also be added to script_nersc_aggregator.sh !

	# Return list of output directory/filename mappings for a
	# offline monitoring job.

	# Map of local file(key) to output file(value)
	RFSTR = '%06d_%03d' % (RUN, FILE)
	outfiles = {}
	outfiles['job_info_%s.tgz'  % RFSTR               ] = 'job_info/%06d/job_info_%s.tgz' % (RUN, RFSTR)
	outfiles['match:converted_random*.hddm'           ] = 'converted_random/%06d' % (RUN)
	outfiles['dana_rest.hddm'                         ] = 'REST/%06d/dana_rest_%s.hddm' % (RUN, RFSTR)
	outfiles['hd_root.root'                           ] = 'hists/%06d/hd_root_%s.root' % (RUN, RFSTR)
	#outfiles['tree_bcal_hadronic_eff.root'            ] = 'tree_bcal_hadronic_eff/%06d/tree_bcal_hadronic_eff_%s.root' % (RUN, RFSTR)
	#outfiles['tree_fcal_hadronic_eff.root'            ] = 'tree_fcal_hadronic_eff/%06d/tree_fcal_hadronic_eff_%s.root' % (RUN, RFSTR)
	#outfiles['tree_PSFlux.root'                       ] = 'tree_PSFlux/%06d/tree_PSFlux_%s.root' % (RUN, RFSTR)
	#outfiles['tree_trackeff.root'                     ] = 'tree_trackeff/%06d/tree_trackeff_%s.root' % (RUN, RFSTR)
	#outfiles['tree_p2k_dirc.root'                     ] = 'tree_p2k_dirc/%06d/tree_p2k_dirc_%s.root' % (RUN, RFSTR)
	#outfiles['tree_p2pi_dirc.root'                    ] = 'tree_p2pi_dirc/%06d/tree_p2pi_dirc_%s.root' % (RUN, RFSTR)
	#outfiles['hd_root_tofcalib.root'                  ] = 'hd_root_tofcalib/%06d/hd_root_tofcalib_%s.root' % (RUN, RFSTR)
	#outfiles['hd_rawdata_%s.pi0fcaltofskim.evio' % RFSTR ] = 'pi0fcaltofskim/%06d/pi0fcaltofskim_%s.evio' % (RUN, RFSTR)
	#outfiles['syncskim.root'                          ] = 'syncskim/%06d/syncskim_%s.root' % (RUN, RFSTR)
	#outfiles['tree_TPOL.root'                         ] = 'tree_TPOL/%06d/tree_TPOL_%s.root' % (RUN, RFSTR)
        
	return outfiles

#----------------------------------------------------
def ReconOutFiles(RUN, FILE):

	# WARNING: Additions here need to also be added to script_nersc_aggregator.sh !

	# Return list of output directory/filename mappings for a
	# reconstruction job.

	# Map of local file(key) to output file(value)
	RFSTR = '%06d_%03d' % (RUN, FILE)
	outfiles = {}
	outfiles['job_info_%s.tgz'  % RFSTR               ] = 'job_info/%06d/job_info_%s.tgz' % (RUN, RFSTR)
	outfiles['tree_fcal_hadronic_eff.root'            ] = 'tree_fcal_hadronic_eff/%06d/tree_fcal_hadronic_eff_%s.root' % (RUN, RFSTR)
	outfiles['tree_bcal_hadronic_eff.root'            ] = 'tree_bcal_hadronic_eff/%06d/tree_bcal_hadronic_eff_%s.root' % (RUN, RFSTR)
	outfiles['tree_TS_scaler.root'                    ] = 'tree_TS_scaler/%06d/tree_TS_scaler_%s.root' % (RUN, RFSTR)
	outfiles['p3pi_excl_skim.root'                    ] = 'p3pi_excl_skim/%06d/p3pi_excl_skim_%s.root' % (RUN, RFSTR)
	outfiles['tree_trackeff.root'                     ] = 'tree_trackeff/%06d/tree_trackeff_%s.root' % (RUN, RFSTR)
	outfiles['tree_tof_eff.root'                      ] = 'tree_tof_eff/%06d/tree_tof_eff_%s.root' % (RUN, RFSTR)
	outfiles['tree_sc_eff.root'                       ] = 'tree_sc_eff/%06d/tree_sc_eff_%s.root' % (RUN, RFSTR)
	outfiles['tree_TPOL.root'                         ] = 'tree_TPOL/%06d/tree_TPOL_%s.root' % (RUN, RFSTR)
	outfiles['tree_PSFlux.root'                       ] = 'tree_PSFlux/%06d/tree_PSFlux_%s.root' % (RUN, RFSTR)
	outfiles['hd_rawdata_%s.sync.evio' % RFSTR        ] = 'sync/%06d/sync_%s.evio' % (RUN, RFSTR)
	outfiles['hd_rawdata_%s.random.evio' % RFSTR      ] = 'random/%06d/random_%s.evio' % (RUN, RFSTR)
	outfiles['hd_rawdata_%s.omega.evio' % RFSTR       ] = 'omega/%06d/omega_%s.evio' % (RUN, RFSTR)
	outfiles['hd_rawdata_%s.ps.evio' % RFSTR          ] = 'ps/%06d/ps_%s.evio' % (RUN, RFSTR)
	outfiles['hd_rawdata_%s.FCAL-LED.evio' % RFSTR    ] = 'FCAL-LED/%06d/FCAL-LED_%s.evio' % (RUN, RFSTR)
	outfiles['hd_rawdata_%s.DIRC-LED.evio' % RFSTR    ] = 'DIRC-LED/%06d/DIRC-LED_%s.evio' % (RUN, RFSTR)
	outfiles['hd_rawdata_%s.CCAL-LED.evio' % RFSTR    ] = 'CCAL-LED/%06d/CCAL-LED_%s.evio' % (RUN, RFSTR)
	outfiles['hd_rawdata_%s.BCAL-LED.evio' % RFSTR    ] = 'BCAL-LED/%06d/BCAL-LED_%s.evio' % (RUN, RFSTR)
	#outfiles['dana_rest_coherent_peak.hddm'           ] = 'dana_rest_coherent_peak/%06d/dana_rest_coherent_peak_%s.hddm' % (RUN, RFSTR)
	outfiles['dana_rest.hddm'                         ] = 'REST/%06d/dana_rest_%s.hddm' % (RUN, RFSTR)
	outfiles['hd_root.root'                           ] = 'hists/%06d/hd_root_%s.root' % (RUN, RFSTR)
	outfiles['match:converted_random*.hddm'           ] = 'converted_random/%06d' % (RUN)

	return outfiles

#----------------------------------------------------
def GetRunInfo():

	# Get the list of runs to process and the number of EVIO files for each.
	# The list is returned in the form of a dictionary with the run numbers
	# as keys and the maximum evio file number for that run as values.
	# Which runs show up in the list depends on how the RUNS and RCDB_QUERY
	# globals are set:
	#
	# RUNS is not None: All runs in the list are included
	# RUNS is empty and RCDB_QUERY is None: All runs in the range MINRUN-MAXRUN inclusive are included
	# RUNS is empty and RCDB_QUERY is not None: RCDB is queried for the list of runs.
	#
	# n.b. that for the first 2 options above, the GetNumEVIOFiles routine
	# below is called which queries the RCDB via mysql directly so the RCDB
	# python module does not actually need to be in PYTHONPATH. For the 3rd
	# option, the RCDB python API is used so it is needed.

	global RUNS, MINRUN, MAXRUN, RCDB_QUERY, RUN_LIST_SOURCE, BAD_RCDB_QUERY_RUNS, BAD_FILE_COUNT_RUNS
	good_runs = {}
	
	# If RCDB_QUERY is not defined, define with value None
	try: RCDB_QUERY
	except : RCDB_QUERY = None

	# Query through RCDB API
	if len(RUNS)==0 and RCDB_QUERY!=None:
		RUN_LIST_SOURCE = 'RCDB ' + str(MINRUN) + '-' + str(MAXRUN) + ' (query="' + RCDB_QUERY + '")'
		print 'Querying RCDB for run list ....'

		# Import RCDB python module. Add a path on the CUE just in case
		# PYTHONPATH is not already set
		sys.path.append('/group/halld/Software/builds/Linux_CentOS7-x86_64-gcc4.8.5/rcdb/rcdb_0.06.00/python')
		import rcdb

		db = rcdb.RCDBProvider('mysql://' + RCDB_USER + '@' + RCDB_HOST + '/rcdb')
		print 'RCDB_QUERY = ' + RCDB_QUERY
		for r in db.select_runs(RCDB_QUERY, MINRUN, MAXRUN):
			evio_files_count = r.get_condition_value('evio_files_count')
			if evio_files_count == None:
				print('ERROR in RCDB: Run ' + str(r.number) + ' has no value for evio_files_count!...')
				BAD_RCDB_QUERY_RUNS.append( int(r.number) )
				print('Attempting to extract number of files by examining /mss ...')
				rawdatafiles = glob.glob('/mss/halld/RunPeriod-'+RUNPERIOD+'/rawdata/Run%06d/hd_rawdata_%06d_*.evio' % (r.number,r.number))
				if len(rawdatafiles) > 0: evio_files_count = len(rawdatafiles)
			if evio_files_count == None:
				print('ERROR getting number of files for: Run ' + str(r.number) )
				BAD_FILE_COUNT_RUNS.append( int(r.number) )
				continue
			good_runs[r.number] = int(evio_files_count)
	elif len(RUNS)==0 :
		RUN_LIST_SOURCE = 'All runs in range ' + str(MINRUN) + '-' + str(MAXRUN)
		print 'Getting info for all runs in range ' + str(MINRUN) + '-' + str(MAXRUN) + ' ....'
		for RUN in range(MINRUN, MAXRUN+1): good_runs[RUN] = GetNumEVIOFiles(RUN)
	else:
		RUN_LIST_SOURCE = 'Custom list: ' + ' '.join([str(x) for x in RUNS])
		print 'Getting info for runs : ' + ' '.join([str(x) for x in RUNS])
		for RUN in RUNS: good_runs[RUN] = GetNumEVIOFiles(RUN)

	# Filter out runs in the EXCLUDE_RUNS list
	global EXCLUDE_RUNS
	good_runs_filtered = {}
	for run in good_runs.keys():
		if run not in EXCLUDE_RUNS: good_runs_filtered[run] = good_runs[run]

	return good_runs_filtered

#----------------------------------------------------
def GetNumEVIOFiles(RUN):

	global BAD_RCDB_QUERY_RUNS, BAD_FILE_COUNT_RUNS

	# Access RCDB to get the number of EVIO files for this run.
	# n.b. the file numbers start from 0 so the last valid file
	# number will be one less than the value returned
	global RCDB, cnx, cur
	if not RCDB :
		try:
			RCDB = 'mysql://' + RCDB_USER + '@' + RCDB_HOST + '/rcdb'
			cnx = mysql.connector.connect(user=RCDB_USER, host=RCDB_HOST, database='rcdb')
			cur = cnx.cursor()  # using dictionary=True crashes when running on ifarm (??)
		except Exception as e:
			print 'Error connecting to RCDB: ' + RCDB
			print str(e)
			sys.exit(-1)

	Nfiles = 0
	sql  = 'SELECT int_value from conditions,condition_types WHERE condition_type_id=condition_types.id'
	sql += ' AND condition_types.name="evio_files_count" AND run_number=' + str(RUN);
	cur.execute(sql)
	c_rows = cur.fetchall()
	if len(c_rows)>0 :
		Nfiles = int(c_rows[0][0])
	else:
		BAD_RCDB_QUERY_RUNS.append(RUN)
		print('Attempting to extract number of files by examining /mss ...')
		rawdatafiles = glob.glob('/mss/halld/RunPeriod-'+RUNPERIOD+'/rawdata/Run%06d/hd_rawdata_%06d_*.evio' % (RUN,RUN))
		if len(rawdatafiles) > 0:
			Nfiles = len(rawdatafiles)
		else:
			BAD_FILE_COUNT_RUNS.append(RUN)


	return Nfiles

#----------------------------------------------------
def GetNumEventsPerFile(RUN):

	# This will query the HOSS database to get the number of events
	# in each raw data evio file for the given run. The results will
	# be returned as a dictionary with the key being the file number
	# and the value the total number of events in the file.

	# Open connection to DB on first call and reuse it for subsequent
	# calls.
	global HOSS, hoss_cnx, hoss_cur
	if not HOSS :
		try:
			HOSS = 'mysql://' + HOSS_USER + '@' + HOSS_HOST + '/hoss'  # This is only used as a flag to say whether we connected to the DB already
			hoss_cnx = mysql.connector.connect(user=HOSS_USER, host=HOSS_HOST, database='HOSS')
			hoss_cur = hoss_cnx.cursor()  # using dictionary=True crashes when running on ifarm (??)
		except Exception as e:
			print 'Error connecting to HOSS DB: ' + RCDB
			print str(e)
			sys.exit(-1)

	sql  = 'SELECT run,file,(num_physics_events+num_bor_events+num_epics_events+num_control_events) AS nevents'
	sql += ' FROM skiminfo WHERE run=%d' % (RUN)

	hoss_cur.execute(sql)
	myresult = hoss_cur.fetchall()

	NUM_EVENTS_BY_FILE = {}
	for row in myresult:
		run     = int(row[0])
		fil     = int(row[1])
		nevents = int(row[2])
		NUM_EVENTS_BY_FILE[fil] = nevents

	return NUM_EVENTS_BY_FILE

#----------------------------------------------------
def GetFileNumbersToProcess(Nfiles):

	# This will return a list of file numbers to process for a run
	# given the number of files given by Nfiles. The list is determined
	# by the values MINFILENO, MAXFILENO and FILE_FRACTION.
	# First, the actual range of file numbers for the run is determined
	# by MINFILENO-MAXFILENO, but clipped if necessary to Nfiles.
	# Next, a list of files in that range representing FILE_FRACTION
	# of the range is formed and returned.
	#
	# Example 1: Process first 10 files of each run:
	#             MINFILENO = 0
	#             MAXFILENO = 9
	#         FILE_FRACTION = 1.0
	#
	# Example 2: Process first 5% of files of each run of
	#            files distributed throughout run:
	#             MINFILENO = 0
	#             MAXFILENO = 1000    n.b. set this to something really big
	#         FILE_FRACTION = 0.05
	#
	
	global MINFILENO, MAXFILENO, FILE_FRACTION
	
	# Make sure MINFILENO is not greater than max file number for the run
	if MINFILENO >= Nfiles : return []

	# Limit max file number to how many there are for this run according to RCDB
	maxfile = MAXFILENO+1  # set to 1 past the actual last file number we want to process
	if Nfiles < maxfile : maxfile = Nfiles
	
	# If FILE_FRACTION is 1.0 then we want all files in the range. 
	if FILE_FRACTION == 1.0: return range( MINFILENO, maxfile)
	
	# At this point, maxfile should be one greater than the last file
	# number we want to process. If the last file we want to process
	# is the last file in the run, then it could be a short file. Thus,
	# use the next to the last file in the run to determine the range.
	if Nfiles < MAXFILENO : maxfile -= 1
	
	# Number of files in run to process
	Nrange = float(maxfile-1) - float(MINFILENO)
	N = math.ceil(FILE_FRACTION * Nrange)
	if N<2 : return [MINFILENO]
	nskip = Nrange/(N-1)
	filenos = []
	for i in range(0, int(N)): filenos.append(int(i*nskip))
#	print 'Nrange=%f N=%f nskip=%f ' % (Nrange, N, nskip)
	
	return filenos

#----------------------------------------------------
def PrintConfigSummary():
	print '================================================='
	print 'Launch Summary  ' + ('**** TEST MODE ****' if TESTMODE else '')
	print '-----------------------------------------------'
	print '             RunPeriod: ' + RUNPERIOD
	print '           Launch type: ' + LAUNCHTYPE
	print '               Version: ' + VER
	print '                 batch: ' + BATCH
	print '              WORKFLOW: ' + WORKFLOW
	print '    Origin of run list: ' + RUN_LIST_SOURCE
	print '        Number of runs: ' + str(len(good_runs))
	print '       Number of files: ' + str(NUM['files_to_process']) + ' (maximum ' + str(MAXFILENO-MINFILENO+1) + ' files/run)'
	print '         Min. file no.: ' + str(MINFILENO)
	print '         Max. file no.: ' + str(MAXFILENO)
	print '   Max. events per job: ' + str(EVENTSPERJOB)
	print '      events per block: ' + str(EVENTSPERBLOCK)
	print '   whole file fallback: ' + str(SUBMIT_WHOLE_FILE_IF_HOSS_MISSING)
	print '         NERSC project: ' + PROJECT
	print '                   QOS: ' + QOS + '      (default)'
	print '             QOS_SPLIT: ' + QOS_SPLIT + '   (only for jobs that can be split)'
	print '    Time limit per job: ' + TIMELIMIT + '  (whole file jobs only)'
	print '  Time limit split job: ' + TIMELIMIT_SPLIT + '  (split jobs only)'
	print ' Time limit merge jobs: ' + TIMELIMIT_AGGREGATOR + '  (used only for split jobs)'
	print '  Shifter/Docker image: ' + IMAGE
	print '   halld_recon version: ' + RECONVERSION + ' (from CVMFS)'
	print '      Output directory: ' + OUTPUTTOP
	print '================================================='

#----------------------------------------------------

# --------------- MAIN --------------------

# Initialize some counters
NUM = {}
NUM['files_to_process'] = 0
NUM['files_submitted'] = 0
NUM['jobs_to_process'] = 0
NUM['jobs_submitted'] = 0
NUM['split_jobs_to_process'] = 0
NUM['split_jobs_submitted'] = 0
NUM['aggregator_jobs_to_process'] = 0
NUM['aggregator_jobs_submitted'] = 0

# Get list of runs with number of evio files for each.
# (parameters for search set at top of file)
good_runs = GetRunInfo()

# Print some info before doing anything
for n in [x for (y,x) in good_runs.iteritems()]:
	NUM['files_to_process'] += len(GetFileNumbersToProcess(n))

if VERBOSE > 0: PrintConfigSummary()

# Create workflow
cmd =  ['swif2', 'create', '-workflow', WORKFLOW]
cmd += ['-site', 'nersc/cori', '-site-storage', 'nersc:'+PROJECT]
cmd += ['-max-concurrent', MAX_CONCURRENT_JOBS]
if VERBOSE>0 : print 'Workflow creation command: ' + ' '.join(cmd)
if TESTMODE:
	print '(TEST MODE so command will not be run)'
else:
	(cmd_out, cmd_err) = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE).communicate()
	if VERBOSE>0:
		if len(cmd_err)>0 :
			if VERBOSE>1 : print cmd_err
			print 'Command returned error message. Assuming workflow already exists'
		else:
			print cmd_out

# Run workflow
cmd =  ['swif2', 'run', '-workflow', WORKFLOW]
if VERBOSE>0 : print 'Command to start workflow: ' + ' '.join(cmd)
if TESTMODE:
	print '(TEST MODE so command will not be run)'
else:
	(cmd_out, cmd_err) = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE).communicate()
	if VERBOSE>0:
		print cmd_out
		print cmd_err

# Loop over runs
DIRS_CREATED = []   # keeps track of local directories we create so we don't create them twice
if VERBOSE>0 :
	print 'Submitting jobs ....'
	print '-----------------------------------------------'
for (RUN, Nfiles) in good_runs.iteritems():

	# Get number of events in each file in the run
	nevents_per_file = GetNumEventsPerFile( RUN )

	# Get list of files to process
	files_to_process = GetFileNumbersToProcess( Nfiles )
	
	# Loop over files, creating job for each
	for FILE in files_to_process:
	
		# Some files are missing entries in the HOSS DB. Log these so
		# they can be printed in the summary. If the SUBMIT_WHOLE_FILE_IF_HOSS_MISSING
		# flag is set, go ahead and submit them as whole file jobs
		if FILE not in nevents_per_file.keys():
			if RUN not in BAD_EVNT_COUNT_RUNS: BAD_EVNT_COUNT_RUNS[RUN] = []
			BAD_EVNT_COUNT_RUNS[RUN].append(FILE)
			if SUBMIT_WHOLE_FILE_IF_HOSS_MISSING:
				nevents_per_file[FILE] = 0  # This will force a single job to be created
			else:
				continue
	
		MakeJob(RUN, FILE, nevents_per_file[FILE])
		if VERBOSE>0:
			sys.stdout.write('  ' + str(NUM['files_submitted']) + '/' + str(NUM['files_to_process']) + ' jobs \r')
			sys.stdout.flush()


print('\n')
print('NOTE: The values in BAD_RCDB_QUERY_RUNS is informative about what is missing from')
print('      the RCDB. An attempt to recover the information from the /mss filesystem')
print('      was also made. Values in BAD_FILE_COUNT_RUNS are ones for which that failed.')
print('      Thus, only runs listed in BAD_FILE_COUNT_RUNS will not have any jobs submitted')
print 'BAD_RCDB_QUERY_RUNS=' + str(BAD_RCDB_QUERY_RUNS)
print 'BAD_FILE_COUNT_RUNS=' + str(BAD_FILE_COUNT_RUNS)
print 'BAD_EVNT_COUNT_RUNS=' + str(BAD_EVNT_COUNT_RUNS)
print 'BAD_MSS_FILE_RUNS='   + str(BAD_MSS_FILE_RUNS)

# If more than 5 jobs were submitted then the summary printed above probably
# rolled off of the screen. Print it again.
if (VERBOSE > 0) and (NUM['jobs_to_process']>5): PrintConfigSummary()

NUM['whole_file_jobs_submitted'] = NUM['jobs_submitted'] - NUM['split_jobs_submitted'] - NUM['aggregator_jobs_submitted']
NUM['whole_file_jobs_to_process'] = NUM['jobs_to_process'] - NUM['split_jobs_to_process'] - NUM['aggregator_jobs_to_process']

NUM['missing_mss_files'] = 0
for run,files in BAD_MSS_FILE_RUNS.items(): NUM['missing_mss_files'] += len(files)

print('')
print('WORKFLOW: ' + WORKFLOW)
print('------------------------------------')
print('Number of runs: ' + str(len(good_runs)) + '  (only good runs)')
print(str(NUM['files_submitted']) + '/' + str(NUM['files_to_process']) + ' total files submitted  (' + str(NUM['missing_mss_files']) + ' files missing from mss)')
print(str(NUM['jobs_submitted']) + '/' + str(NUM['jobs_to_process']) + ' total jobs submitted')
print(str(NUM['whole_file_jobs_submitted']) + '/' + str(NUM['whole_file_jobs_to_process']) + '  whole file jobs submitted')
print(str(NUM['split_jobs_submitted']) + '/' + str(NUM['split_jobs_to_process']) + ' split jobs submitted (non-aggregator)')
print(str(NUM['aggregator_jobs_submitted']) + '/' + str(NUM['aggregator_jobs_to_process']) + ' aggregator jobs submitted')
print(str(len(DIRS_CREATED)) + ' directories created for output')
print('')
