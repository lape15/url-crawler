package job_store

import (
	"fmt"
	"sync"
	"time"

	"github.com/lape15/sykell-task-root/types"
)

type URLStatus string

const (
	StatusQueued  URLStatus = "queued"
	StatusRunning URLStatus = "running"
	StatusSuccess URLStatus = "success"
	StatusFailed  URLStatus = "failed"
)

type URLProgress struct {
	URL        string     `json:"url"`
	Status     URLStatus  `json:"status"`
	Message    string     `json:"message,omitempty"`
	StartedAt  *time.Time `json:"started_at,omitempty"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
}

type JobStatus string

const (
	JobPending  JobStatus = "pending"
	JobRunning  JobStatus = "running"
	JobComplete JobStatus = "complete"
	JobFailed   JobStatus = "failed"
)

type Job struct {
	ID        string                       `json:"id"`
	CreatedAt time.Time                    `json:"created_at"`
	Status    JobStatus                    `json:"status"`
	Progress  map[string]*URLProgress      `json:"progress"`
	Result    map[string]types.CrawlResult `json:"result"`
	Err       string                       `json:"error,omitempty"`
}

type JobStore struct {
	mu   sync.RWMutex
	jobs map[string]*Job
}

func NewJobStore() *JobStore {
	return &JobStore{
		jobs: make(map[string]*Job),
	}
}
func (js *JobStore) Create(id string, urls []string) *Job {
	js.mu.Lock()
	defer js.mu.Unlock()
	p := make(map[string]*URLProgress, len(urls))
	for _, u := range urls {
		p[u] = &URLProgress{URL: u, Status: StatusQueued}
	}
	j := &Job{
		ID:        id,
		CreatedAt: time.Now(),
		Status:    JobPending,
		Progress:  p,
		Result:    make(map[string]types.CrawlResult),
	}
	js.jobs[id] = j
	return j
}

func (js *JobStore) Get(id string) (*Job, bool) {
	js.mu.RLock()
	defer js.mu.RUnlock()
	j, ok := js.jobs[id]
	return j, ok
}

func (js *JobStore) Update(jobID string, fn func(*Job) error) error {
	js.mu.Lock()
	defer js.mu.Unlock()
	j, ok := js.jobs[jobID]
	if !ok {
		return fmt.Errorf("job %s not found", jobID)
	}
	return fn(j)
}

func (js *JobStore) SetURLStatus(jobID, url string, status URLStatus, msg string, when *time.Time) error {
	return js.Update(jobID, func(j *Job) error {
		p, ok := j.Progress[url]
		if !ok {
			return fmt.Errorf("url %s not tracked in job %s", url, jobID)
		}
		p.Status = status
		if msg != "" {
			p.Message = msg
		}
		if status == StatusRunning && when != nil {
			p.StartedAt = when
		}
		if (status == StatusSuccess || status == StatusFailed) && when != nil {
			p.FinishedAt = when
		}
		return nil
	})
}
