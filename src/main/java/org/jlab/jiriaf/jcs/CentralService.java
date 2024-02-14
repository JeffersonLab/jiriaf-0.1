package org.jlab.jiriaf.jcs;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

public class CentralService {
    public static final int MAX_PENDING_NODES = 5;

    interface Job {
        long timeReq();

        long memReq();

        long cpuReq();
    }

    class PendingNode {
        long time;
        long mem;
        long cpu;
        List<Job> jobs;

        public long timeAvail() {
            return time;
        }

        public long memAvail() {
            return mem - jobs.stream().collect(Collectors.summingLong(Job::memReq));
        }

        public long cpuAvail() {
            return cpu - jobs.stream().collect(Collectors.summingLong(Job::cpuReq));
        }

        /*
         * Add job to node if possible, given resources available and required.
         * Return true iff accepted.
         */
        public boolean accept(Job job) {
            if (job.timeReq() > timeAvail() || job.memReq() > memAvail() || job.cpuReq() > cpuAvail()) {
                return false;
            }
            jobs.add(job);
            return true;
        }

        public void reset() {
            jobs.clear();
        }
    }

    /*
     * Allocate a node suitable for running the specified job.  The logic for this
     * should take into account the characteristics of the specified job, along with
     * other heuristics and knowledge of the status of remote compute sites to choose
     * an appropriate node.
     *
     * The allocated node should be over-provisioned for the specified job so that it
     * can accommodate other jobs as well.
     */
    public Optional<PendingNode> allocateNodeForJob(Job job) {
        // TODO
        return Optional.empty();
    }

    /*
     * Gather backlog of unscheduled jobs
     */
    public List<Job> queryBacklog() {
        // TODO
        return new ArrayList<>();
    }

    /*
     * Gather currently pending nodes: ones which have been requested, but
     * which have not yet become active.
     */
    public List<PendingNode> queryPendingNodes() {
        // TODO
        return new ArrayList<>();
    }

    /*
     * Examine backlog and currently pending nodes to determine whether more nodes
     * need to be allocated.
     */
    public void survey() {
        /*
         * Store backlog and pending nodes sorted by descending time req/avail
         */
        var backlog = new ArrayList<>(queryBacklog());
        backlog.sort(Comparator.comparingLong(Job::timeReq).reversed());
        var pendingNodes = new ArrayList<>(queryPendingNodes());
        pendingNodes.sort(Comparator.comparingLong(PendingNode::timeAvail).reversed());
        /*
         * For each job in the backlog, find the first pending node that can accept it,
         * allocating a new one if necessary and possible.
         */
        for (var job : backlog) {
            boolean accepted = false;
            for (var node : pendingNodes) {
                if (node.accept(job)) {
                    accepted = true;
                    break;
                }
            }
            if (!accepted && pendingNodes.size() < MAX_PENDING_NODES) {
                var newNode = allocateNodeForJob(job);
                if (!newNode.isEmpty()) {
                    newNode.get().accept(job);
                    pendingNodes.add(newNode.get());
                    pendingNodes.sort(Comparator.comparingLong(PendingNode::timeAvail).reversed());
                }
            }
        }
    }
}
