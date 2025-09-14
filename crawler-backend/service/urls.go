package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/gin-gonic/gin"
	"github.com/gocolly/colly"
	"github.com/gorilla/websocket"
	"github.com/lape15/sykell-task-root/db"
)

type CrawlerInput struct {
	URL string `json:"url"`
}

var visitedurls = make(map[string]bool)

type CrawlResult struct {
	ID            int64
	URL           string
	HTMLVersion   string
	Title         string
	HeadingsCount map[string]int
	InternalLinks int
	ExternalLinks int
	BrokenLinks   int
	HasLoginForm  bool
	UserID        string
}

func handleSuccessfulCrawl(result CrawlResult, url string, ws *websocket.Conn, c *gin.Context) {
	userId, _ := c.Get("userID")
	result.UserID = userId.(string)
	urlExists, _ := db.GetUrlByTitle(url)
	if urlExists == nil {
		db := db.GetDB()
		lastInserted, err := db.Exec("INSERT INTO urls (url, html_version, page_title, internal_links_count, external_links_count, broken_links_count, has_login_form,user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", result.URL, result.HTMLVersion, result.Title, result.InternalLinks, result.ExternalLinks, result.BrokenLinks, result.HasLoginForm, result.UserID)
		if err != nil {
			ws.WriteJSON(gin.H{"status": "error", "message": "Database error"})
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		result.ID, _ = lastInserted.LastInsertId()
	} else {
		result.ID = urlExists.ID
		fmt.Println("Result:", result)

	}
	// Notify WS of completion
	ws.WriteJSON(gin.H{"status": "completed", "message": "Crawl finished successfully"})

	// Send final HTTP response
	c.JSON(200, gin.H{
		"message": "Crawling completed",
		"result":  result,
	})
}

func CrawlURL(c *gin.Context) {
	crawlerString := CrawlerInput{}
	// if len(urls) > 0 {
	// 	crawlerString.URL = urls[0]
	// } else
	if c.BindJSON(&crawlerString) != nil {
		c.JSON(400, gin.H{
			"error": "Invalid request",
		})
		return
	}

	ws := WSConnectionForURL(crawlerString.URL)
	if ws == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active WebSocket connection for this URL"})
		return
	}

	// Cancellation context
	// ctx, cancel := context.WithCancel(context.Background())
	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()
	crawlersMutex.Lock()
	activeCancelFns[crawlerString.URL] = cancel

	crawlersMutex.Unlock()

	defer func() {
		// Cleanup

		crawlersMutex.Lock()
		delete(activeCancelFns, crawlerString.URL)
		delete(activeCrawlers, crawlerString.URL)
		crawlersMutex.Unlock()
	}()

	resultChan := make(chan CrawlResult, 1)
	errChan := make(chan error, 1)
	doneChan := make(chan struct{})

	go func() {
		defer close(doneChan)
		result, err := crawlWithContext(ctx, crawlerString.URL, ws)
		if err != nil {
			errChan <- err
			return
		}
		resultChan <- result
	}()

	select {
	case result := <-resultChan:
		// Double-check if context was cancelled before handling result
		if ctx.Err() != nil {
			ws.WriteJSON(gin.H{"status": "cancelled", "message": "Crawl was cancelled"})
			c.JSON(499, gin.H{"message": "Crawl cancelled by client"})
			return
		}

		handleSuccessfulCrawl(result, crawlerString.URL, ws, c)

	case err := <-errChan:
		if errors.Is(err, context.Canceled) {
			ws.WriteJSON(gin.H{"status": "cancelled", "message": "Crawl was cancelled"})
			c.JSON(499, gin.H{"message": "Crawl cancelled by client"})
		} else {
			ws.WriteJSON(gin.H{"status": "error", "message": err.Error()})
			c.JSON(500, gin.H{"error": err.Error()})
		}

	case <-ctx.Done():
		ws.WriteJSON(gin.H{"status": "cancelled", "message": "Crawl was cancelled"})
		c.JSON(499, gin.H{"message": "Crawl cancelled by client"})
	}

}

func crawlWithContext(ctx context.Context, currentURL string, ws *websocket.Conn) (CrawlResult, error) {

	result := CrawlResult{
		URL:           currentURL,
		HeadingsCount: make(map[string]int),
	}

	c := colly.NewCollector(
		colly.MaxDepth(2),
		colly.AllowedDomains(extractDomain(currentURL)),
		colly.Async(true),
	)

	c.SetRequestTimeout(30 * time.Second)
	c.Limit(&colly.LimitRule{DomainGlob: "*", Parallelism: 2})

	// Register collector
	crawlersMutex.Lock()
	activeCrawlers[currentURL] = c
	crawlersMutex.Unlock()

	c.OnRequest(func(r *colly.Request) {
		select {
		case <-ctx.Done():
			r.Abort()
			return
		default:
			ws.WriteJSON(gin.H{
				"status":  "progress",
				"message": fmt.Sprintf("Visiting %s", r.URL.String()),
			})
		}
	})

	// Error handling

	c.OnError(func(r *colly.Response, err error) {
		if ctx.Err() == nil { // Only send errors if not cancelled
			ws.WriteJSON(gin.H{
				"status":  "error",
				"message": fmt.Sprintf("Error visiting %s: %v", r.Request.URL, err),
			})
		}
	})

	c.OnHTML("html", func(e *colly.HTMLElement) {

		result.Title = e.DOM.Find("title").Text()

		// HTML version
		if strings.Contains(string(e.Response.Body), "<!DOCTYPE html>") {
			result.HTMLVersion = "HTML5"
		} else {
			result.HTMLVersion = "Unknown"
		}

		// Headings H1–H6
		for i := 1; i <= 6; i++ {
			tag := fmt.Sprintf("h%d", i)
			count := e.DOM.Find(tag).Length()
			if count > 0 {
				result.HeadingsCount[tag] = count
			}
		}

		// Detect login form
		e.DOM.Find("form").Each(func(_ int, s *goquery.Selection) {
			if s.Find("input[type='password']").Length() > 0 {
				result.HasLoginForm = true
			}
		})
	})

	// Link analysis
	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		href := e.Request.AbsoluteURL(e.Attr("href"))
		if href == "" || visitedurls[href] {
			return
		}
		visitedurls[href] = true

		// Internal vs external
		if isSameDomain(currentURL, href) {
			result.InternalLinks++
		} else {
			result.ExternalLinks++
		}

		// accessible links
		resp, err := http.Head(href)
		if err != nil || resp.StatusCode >= 400 {
			result.BrokenLinks++
		}
	})

	if err := c.Visit(currentURL); err != nil {
		return result, err
	}

	done := make(chan struct{})
	go func() {
		c.Wait()
		close(done)
	}()

	select {
	case <-done:
		return result, nil
	case <-ctx.Done():
		if ctx.Err() != nil {
			return result, ctx.Err()
		}
		return result, nil
	}
}

func extractDomain(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	return u.Host
}

func isSameDomain(baseURL, compareURL string) bool {
	base, err1 := url.Parse(baseURL)
	comp, err2 := url.Parse(compareURL)
	if err1 != nil || err2 != nil {
		return false
	}
	return base.Hostname() == comp.Hostname()
}
