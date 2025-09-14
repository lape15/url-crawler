package service

import (
	"context"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

// Holds URL-specific crawl state
type CrawlState struct {
	Ctx    context.Context
	Cancel context.CancelFunc
}

// Global map: url -> crawl state
var urlCrawlStates = make(map[string]*CrawlState)
var urlStateMutex sync.RWMutex

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

	const workerCount = 5
	urlChan := make(chan string)
	var wg sync.WaitGroup

	// Start workers
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for u := range urlChan {
				runCrawlJob(c, u)
			}
		}()
	}

	go func() {
		for _, u := range input.Urls {
			urlChan <- u
		}
		close(urlChan)
	}()

	// Wait for all crawls to finish (async)
	go func() {
		wg.Wait()
		// Optionally notify WS that all crawls finished
		for _, u := range input.Urls {
			ws := WSConnectionForURL(u)
			if ws != nil {
				ws.WriteJSON(gin.H{"status": "all_completed", "message": "All crawls finished"})
			}
		}
	}()

	// Respond immediately
	c.JSON(http.StatusAccepted, gin.H{"message": "Crawls started", "urls": input.Urls})
}

// Executes a single URL crawl, sends progress via WS
func runCrawlJob(c *gin.Context, url string) {
	ws := WSConnectionForURL(url)
	if ws == nil {
		c.JSON(http.StatusBadRequest, gin.H{"url": url, "status": "error", "message": "No active WebSocket for this URL"})
		return
	}

	// Create cancellable context
	ctx, cancel := context.WithCancel(context.Background())
	urlStateMutex.Lock()
	urlCrawlStates[url] = &CrawlState{Ctx: ctx, Cancel: cancel}
	urlStateMutex.Unlock()
	defer func() {
		urlStateMutex.Lock()
		delete(urlCrawlStates, url)
		urlStateMutex.Unlock()
	}()

	// Run crawl
	result, err := crawlWithContext(ctx, url, ws)
	if err != nil {
		if ctx.Err() != nil {
			ws.WriteJSON(gin.H{"status": "cancelled", "message": "Crawl cancelled"})
		} else {
			ws.WriteJSON(gin.H{"status": "error", "message": err.Error()})
		}
		return
	}

	// Send final result via WS
	ws.WriteJSON(gin.H{
		"status": "completed",
		"url":    url,
		"result": result,
	})
}
