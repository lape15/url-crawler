package service

import (
	"context"
	"database/sql"
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
	c.Set("url", crawlerString)
	ws := WSConnectionForURL(crawlerString.URL)
	if ws == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active WebSocket connection for this URL"})
		return
	}

	result, err := crawl(crawlerString.URL, 2, ws)

	if err != nil {
		c.JSON(500, gin.H{
			"error processing url": err.Error(),
		})
		return
	}
	userId, _ := c.Get("userID")
	result.UserID = userId.(string)

	urlExists := db.GetUrlByTitle(crawlerString.URL)
	var lastInserted sql.Result
	if urlExists == nil {

		db := db.GetDB()
		lastInserted, err = db.Exec("INSERT INTO urls (url, html_version, page_title, internal_links_count, external_links_count, broken_links_count, has_login_form,user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", result.URL, result.HTMLVersion, result.Title, result.InternalLinks, result.ExternalLinks, result.BrokenLinks, result.HasLoginForm, result.UserID)

		if err != nil {
			c.JSON(500, gin.H{
				"error processing url": err.Error(),
			})
			return
		}
		result.ID, _ = lastInserted.LastInsertId()
	} else {
		result.ID = urlExists.ID
	}
	ws.WriteJSON(map[string]string{"status": "done", "message": "Crawling completed"})
	ws.Close()
	delete(wsConnections, crawlerString.URL)
	c.JSON(200, gin.H{
		"message": "Crawling completed",
		"result":  result,
	})
}

func crawl(currentURL string, maxDepth int, ws *websocket.Conn) (CrawlResult, error) {
	result := CrawlResult{
		URL:           currentURL,
		HeadingsCount: make(map[string]int),
	}

	ctx, cancel := context.WithCancel(context.Background())

	crawlersMutex.Lock()
	// Registering crawler for cancellation
	c := colly.NewCollector(
		colly.MaxDepth(maxDepth),
		colly.AllowedDomains(extractDomain(currentURL)),
	)
	activeCancelFns[currentURL] = cancel
	activeCrawlers[currentURL] = c
	crawlersMutex.Unlock()

	defer func() {
		crawlersMutex.Lock()
		delete(activeCrawlers, currentURL)
		delete(activeCancelFns, currentURL)
		crawlersMutex.Unlock()
	}()

	c.OnRequest(func(r *colly.Request) {
		select {
		case <-ctx.Done():
			r.Abort()
			return
		default:
			r.Ctx.Put("cancelCtx", ctx)
			ws.WriteJSON(gin.H{"status": "processing", "message": fmt.Sprintf("Visiting %s", r.URL.String())})
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
