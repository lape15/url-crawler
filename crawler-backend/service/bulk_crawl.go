package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lape15/sykell-task-root/service/job_store"
	"github.com/lape15/sykell-task-root/utils"
)

// Holds URL-specific crawl state
type CrawlState struct {
	Ctx    context.Context
	Cancel context.CancelFunc
}

// Global map: url -> crawl state
var urlCrawlStates = make(map[string]*CrawlState)
var urlStateMutex sync.RWMutex
var jobStore = job_store.NewJobStore()

func HandleMultipleUrlCrawl(c *gin.Context) {
	var input MultipleCrawledInput
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if len(input.Urls) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No URLs provided"})
		return
	}
	userId, _ := c.Get("userID")
	user := userId.(string)

	jobId := uuid.NewString()
	_ = jobStore.Create(jobId, input.Urls)
	ctx := context.Background()

	const workerCount = 5
	urlChan := make(chan string)
	var wg sync.WaitGroup

	_ = jobStore.Update(jobId, func(job *job_store.Job) error {
		job.Status = job_store.JobRunning
		return nil
	})

	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for u := range urlChan {
				start := time.Now()
				_ = jobStore.SetURLStatus(jobId, u, job_store.StatusRunning, "", &start)
				res, err := utils.RunCrawlJob(ctx, u, user)
				fin := time.Now()
				if err != nil {
					_ = jobStore.SetURLStatus(jobId, u, job_store.StatusFailed, err.Error(), &fin)
				} else {
					_ = jobStore.Update(jobId, func(j *job_store.Job) error {
						j.Result[u] = *res
						p := j.Progress[u]
						p.Status = job_store.StatusSuccess
						p.FinishedAt = &fin
						return nil
					})
				}
			}
		}()
	}

	go func() {
		for _, u := range input.Urls {
			urlChan <- u
		}
		close(urlChan)
	}()

	// Finalize job status

	go func(urls []string) {
		wg.Wait()
		_ = jobStore.Update(jobId, func(j *job_store.Job) error {
			allOK := true
			for _, p := range j.Progress {
				if p.Status == job_store.StatusFailed {
					allOK = false
					break
				}
			}
			if allOK {
				j.Status = job_store.JobComplete
			} else {
				j.Status = job_store.JobFailed
				j.Err = "one or more URLs failed"
			}
			return nil
		})
	}(input.Urls)

	c.JSON(http.StatusAccepted, gin.H{
		"job_id":  jobId,
		"message": "bulk url crawl started",
	})

}

func HandleCrawlStatus(c *gin.Context) {
	jobID := c.Param("jobID")

	if j, ok := jobStore.Get(jobID); ok {
		c.JSON(http.StatusOK, gin.H{
			"job_id":   j.ID,
			"status":   j.Status,
			"progress": j.Progress,
		})
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
}

func HandleCrawlResult(c *gin.Context) {
	jobID := c.Param("jobID")
	if j, ok := jobStore.Get(jobID); ok {
		if j.Status == job_store.JobComplete || j.Status == job_store.JobFailed {
			c.JSON(http.StatusOK, gin.H{
				"job_id": j.ID,
				"status": j.Status,
				"result": j.Result,
				"error":  j.Err,
			})
			return
		}
		c.JSON(http.StatusAccepted, gin.H{"job_id": j.ID, "status": j.Status, "message": "not finished yet"})
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
}

func HandleCrawlSSE(c *gin.Context) {
	jobID := c.Param("jobID")
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	t := time.NewTicker(1 * time.Second)
	defer t.Stop()

	flush := func(payload any) error {
		b, _ := json.Marshal(payload)
		if _, err := fmt.Fprintf(c.Writer, "data: %s\n\n", b); err != nil {
			return err
		}
		c.Writer.Flush()
		return nil
	}

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-t.C:
			if j, ok := jobStore.Get(jobID); ok {
				_ = flush(gin.H{
					"job_id":   j.ID,
					"status":   j.Status,
					"progress": j.Progress,
				})
				if j.Status == job_store.JobComplete || j.Status == job_store.JobFailed {
					return
				}
			} else {
				_ = flush(gin.H{"error": "job not found"})
				return
			}
		}
	}
}
