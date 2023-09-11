package jlab.data;

public class FormInfo {
	

	private String workflow;
	private String accountName;
	private String partitionName;
	private String jobName;
	private String antecedent;
	private String condition;
	private String constraint;
	private int cores;
	private String diskAmount;
	private String diskUnit;
	private String exclusive;
	private String input;
	private String output;
	private int phase;
	private String ramAmount;
	private String ramUnit;
	private String shell;
	private String site;
	private String stdOut;
	private String stderr;
	private String tag;
	private String timeAmount;
	private String timeUnit;

	public FormInfo(String workflow, String accountName, String partitionName, String jobName, String antecedent,
			String condition, String constraint, int cores, String diskAmount, String diskUnit, String exclusive,
			String input, String output, int phase, String ramAmount, String ramUnit, String shell, String site,
			String stdOut, String stderr, String tag, String timeAmount, String timeUnit) {
		this.workflow = workflow;
		this.accountName = accountName;
		this.partitionName = partitionName;
		this.jobName = jobName;
		this.antecedent = antecedent;
		this.condition = condition;
		this.constraint = constraint;
		this.cores = cores;
		this.diskAmount = diskAmount;
		this.diskUnit = diskUnit;
		this.exclusive = exclusive;
		this.input = input;
		this.output = output;
		this.phase = phase;
		this.ramAmount = ramAmount;
		this.ramUnit = ramUnit;
		this.shell = shell;
		this.site = site;
		this.stdOut = stdOut;
		this.stderr = stderr;
		this.tag = tag;
		this.timeAmount = timeAmount;
		this.timeUnit = timeUnit;
	}

	public FormInfo(String accountName) {
	}

	public String getWorkflow() {
		return workflow;
	}

	public void setWorkflow(String workflow) {
		this.workflow = workflow;
	}

	public String getAccountName() {
		return accountName;
	}

	public void setAccountName(String accountName) {
		this.accountName = accountName;
	}

	public String getPartitionName() {
		return partitionName;
	}

	public void setPartitionName(String partitionName) {
		this.partitionName = partitionName;
	}

	public String getJobName() {
		return jobName;
	}

	public void setJobName(String jobName) {
		this.jobName = jobName;
	}

	public String getAntecedent() {
		return antecedent;
	}

	public void setAntecedent(String antecedent) {
		this.antecedent = antecedent;
	}

	public String getCondition() {
		return condition;
	}

	public void setCondition(String condition) {
		this.condition = condition;
	}

	public String getConstraint() {
		return constraint;
	}

	public void setConstraint(String constraint) {
		this.constraint = constraint;
	}

	public int getCores() {
		return cores;
	}

	public void setCores(int cores) {
		this.cores = cores;
	}

	public String getDiskAmount() {
		return diskAmount;
	}

	public void setDiskAmount(String diskAmount) {
		this.diskAmount = diskAmount;
	}

	public String getDiskUnit() {
		return diskUnit;
	}

	public void setDiskUnit(String diskUnit) {
		this.diskUnit = diskUnit;
	}

	public String getExclusive() {
		return exclusive;
	}

	public void setExclusive(String exclusive) {
		this.exclusive = exclusive;
	}

	public String getInput() {
		return input;
	}

	public void setInput(String input) {
		this.input = input;
	}

	public String getOutput() {
		return output;
	}

	public void setOutput(String output) {
		this.output = output;
	}

	public int getPhase() {
		return phase;
	}

	public void setPhase(int phase) {
		this.phase = phase;
	}

	public String getRamAmount() {
		return ramAmount;
	}

	public void setRamAmount(String ramAmount) {
		this.ramAmount = ramAmount;
	}

	public String getRamUnit() {
		return ramUnit;
	}

	public void setRamUnit(String ramUnit) {
		this.ramUnit = ramUnit;
	}

	public String getShell() {
		return shell;
	}

	public void setShell(String shell) {
		this.shell = shell;
	}

	public String getSite() {
		return site;
	}

	public void setSite(String site) {
		this.site = site;
	}

	public String getStdOut() {
		return stdOut;
	}

	public void setStdOut(String stdOut) {
		this.stdOut = stdOut;
	}

	public String getStderr() {
		return stderr;
	}

	public void setStderr(String stderr) {
		this.stderr = stderr;
	}

	public String getTag() {
		return tag;
	}

	public void setTag(String tag) {
		this.tag = tag;
	}

	public String getTimeAmount() {
		return timeAmount;
	}

	public void setTimeAmount(String timeAmount) {
		this.timeAmount = timeAmount;
	}

	public String getTimeUnit() {
		return timeUnit;
	}

	public void setTimeUnit(String timeUnit) {
		this.timeUnit = timeUnit;
	}
}
