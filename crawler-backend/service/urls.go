package service

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"

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

func CrawlURL(c *gin.Context) {
	crawlerString := CrawlerInput{}

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
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	crawlersMutex.Lock()
	activeCancelFns[crawlerString.URL] = cancel
	crawlersMutex.Unlock()

	// Channel for crawler result
	resultChan := make(chan CrawlResult)
	errChan := make(chan error)

	go func() {
		result, err := crawlWithContext(ctx, crawlerString.URL, 2, ws)
		if err != nil {
			errChan <- err
		}
		resultChan <- result
	}()

	select {
	case result := <-resultChan:
		userId, _ := c.Get("userID")
		result.UserID = userId.(string)
		urlExists, _ := db.GetUrlByTitle(crawlerString.URL)
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
		}
		// Notify WS of completion
		ws.WriteJSON(gin.H{"status": "completed", "message": "Crawl finished successfully"})

		// Send final HTTP response
		c.JSON(200, gin.H{
			"message": "Crawling completed",
			"result":  result,
		})

	case err := <-errChan:
		ws.WriteJSON(gin.H{"status": "error", "message": err.Error()})

		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	// Cleanup
	crawlersMutex.Lock()
	delete(activeCancelFns, crawlerString.URL)
	crawlersMutex.Unlock()

}

func crawlWithContext(ctx context.Context, currentURL string, maxDepth int, ws *websocket.Conn) (CrawlResult, error) {
	result := CrawlResult{
		URL:           currentURL,
		HeadingsCount: make(map[string]int),
	}

	c := colly.NewCollector(
		colly.MaxDepth(maxDepth),
		colly.AllowedDomains(extractDomain(currentURL)),
	)
	c.OnRequest(func(r *colly.Request) {
		select {
		case <-ctx.Done():
			r.Abort()
			return
		default:
			ws.WriteJSON(gin.H{"status": "progress", "message": fmt.Sprintf("Visiting %s", r.URL.String())})
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
	c.OnError(func(r *colly.Response, err error) {
		ws.WriteJSON(gin.H{"status": "error", "message": fmt.Sprintf("Error visiting %s: %v", r.Request.URL, err)})
	})
	err := c.Visit(currentURL)
	if err != nil {
		if ctx.Err() != nil {
			ws.WriteJSON(map[string]string{"status": "stopped", "message": "Crawl was cancelled"})
			return result, fmt.Errorf("crawl aborted")
		}
		return result, err
	}

	return result, nil
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
