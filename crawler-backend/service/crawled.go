package service

import (
	"context"
	"fmt"
	"net/url"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/lape15/sykell-task-root/db"
	"github.com/lape15/sykell-task-root/models"
)

func GetCrawledUrls(c *gin.Context) {
	var crawledUrls []models.Url
	userId, _ := c.Get("userID")
	crawledUrls, err := db.GetUrlsByUserId(userId.(string))
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch crawled URLs"})
		return
	}
	c.JSON(200, gin.H{"crawledUrls": crawledUrls})
}

func GetUrlDetails(c *gin.Context) {
	urlParam := c.Query("url")
	if urlParam == "" {
		c.JSON(400, gin.H{"error": "Missing URL path param"})
		return
	}
	decodedURL, err := url.QueryUnescape(urlParam)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid encoded URL"})
		return
	}
	url, err := db.GetUrlByTitle(decodedURL)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"url": url})
}

func DeleteCrawled(c *gin.Context) {
	urlParam := c.Query("url")
	if urlParam == "" {
		c.JSON(400, gin.H{"error": "Missing URL path param"})
		return
	}
	decodedURL, err := url.QueryUnescape(urlParam)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid encoded URL"})
		return
	}
	err = db.DeleteUrlByTitle(decodedURL)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "URL deleted successfully"})
}

type MultipleCrawledInput struct {
	Urls []string `json:"urls"`
}

var input MultipleCrawledInput

func DeleteMultipleCrawled(c *gin.Context) {

	if err := c.BindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	if err := db.DeleteUrlsByTitles(input.Urls); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": fmt.Sprintf("%d URLs deleted successfully", len(input.Urls))})
}

func HandleMultipleUrlCrawl(c *gin.Context) {
	if err := c.BindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}
	const workerCount = 5
	urlChan := make(chan string)
	resultChan := make(chan gin.H)

	// Start workers
	var wg sync.WaitGroup
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for url := range urlChan {
				result := crawlWrapper(c, url)
				resultChan <- result
			}
		}()
	}
	go func() {
		for _, url := range input.Urls {
			urlChan <- url
		}
		close(urlChan)
	}()
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	results := []gin.H{}
	for res := range resultChan {
		results = append(results, res)
	}

	// Send final response
	c.JSON(200, gin.H{"results": results})
}

func crawlWrapper(c *gin.Context, url string) gin.H {
	ws := WSConnectionForURL(url)
	if ws == nil {
		return gin.H{"url": url, "status": "error", "message": "No active WebSocket connection"}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	resultChan := make(chan CrawlResult, 1)
	errChan := make(chan error, 1)

	go func() {
		result, err := crawlWithContext(ctx, url, ws)
		if err != nil {
			errChan <- err
			return
		}
		resultChan <- result
	}()

	select {
	case result := <-resultChan:
		handleSuccessfulCrawl(result, url, ws, c)
		return gin.H{"url": url, "status": "ok"}

	case err := <-errChan:
		return gin.H{"url": url, "status": "error", "message": err.Error()}

	case <-ctx.Done():
		return gin.H{"url": url, "status": "cancelled"}
	}
}
