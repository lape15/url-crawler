package utils

import (
	"context"

	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/gocolly/colly"
	"github.com/lape15/sykell-task-root/db"
	"github.com/lape15/sykell-task-root/models"
	"github.com/lape15/sykell-task-root/types"
)

var visitedUrls = make(map[string]bool)

func RunCrawlJob(ctx context.Context, rawURL string, userId string) (*types.CrawlResult, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("parse url: %w", err)
	}
	urlExists, _ := db.GetUrlByTitle(rawURL)
	fmt.Println(urlExists)
	fmt.Print("it existsssss")
	if urlExists != nil {
		return &types.CrawlResult{
			URL:           urlExists.URL,
			HeadingsCount: urlExists.HeadingsCount,
			InternalLinks: urlExists.InternalLinks,
			ExternalLinks: urlExists.ExternalLinks,
			BrokenLinks:   urlExists.BrokenLinks,
			HasLoginForm:  urlExists.HasLoginForm,
		}, nil
	}
	c := colly.NewCollector(colly.Async(true))
	res := &types.CrawlResult{
		URL:           rawURL,
		HeadingsCount: map[string]int{"h1": 0, "h2": 0, "h3": 0, "h4": 0, "h5": 0, "h6": 0},
	}

	var broken int
	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		href := strings.TrimSpace(e.Attr("href"))
		if href == "" || strings.HasPrefix(href, "javascript:") || strings.HasPrefix(href, "mailto:") {
			return
		}
		abs := e.Request.AbsoluteURL(href)
		if abs == "" {
			return
		}
		// internal vs external
		if tu, err := url.Parse(abs); err == nil && tu.Host == u.Host {
			res.InternalLinks++
		} else {
			res.ExternalLinks++
		}
	})

	// Count headings
	for _, tag := range []string{"h1", "h2", "h3", "h4", "h5", "h6"} {
		local := tag
		c.OnHTML(local, func(e *colly.HTMLElement) {
			res.HeadingsCount[local]++
		})
	}

	// Title
	c.OnHTML("title", func(e *colly.HTMLElement) {
		res.Title = strings.TrimSpace(e.Text)
	})

	// Login form heuristic: a form containing an input[type=password]
	c.OnHTML("form", func(e *colly.HTMLElement) {
		if res.HasLoginForm {
			return
		}
		found := false
		e.ForEach("input", func(_ int, el *colly.HTMLElement) {
			if strings.EqualFold(el.Attr("type"), "password") {
				found = true
			}
		})

		res.HasLoginForm = found

	})

	c.OnResponse(func(r *colly.Response) {
		// Look at the beginning of the body for <!DOCTYPE ...>
		body := r.Body
		peek := strings.ToLower(string(body[:min(256, len(body))]))
		switch {
		case strings.Contains(peek, "<!doctype html>"):
			res.HTMLVersion = "HTML5"
		case strings.Contains(peek, "xhtml"):
			res.HTMLVersion = "XHTML"
		case strings.Contains(peek, "html public \"-//w3c//dtd html 4.01"):
			res.HTMLVersion = "HTML 4.01"
		default:
			if res.HTMLVersion == "" {
				res.HTMLVersion = "Unknown"
			}
		}
	})

	// Broken links: check anchors quickly with a HEAD (fallback GET) — lightweight, optional
	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		href := e.Request.AbsoluteURL(e.Attr("href"))
		if href == "" || visitedUrls[href] {
			return
		}
		visitedUrls[href] = true

		// Internal vs external
		if isSameDomain(rawURL, href) {
			res.InternalLinks++
		} else {
			res.ExternalLinks++
		}

		// accessible links
		resp, err := http.Head(href)
		if err != nil || resp.StatusCode >= 400 {
			res.BrokenLinks++
		}
	})

	var crawlErr error
	c.OnError(func(r *colly.Response, err error) {
		crawlErr = fmt.Errorf("http %d: %w", r.StatusCode, err)
	})

	if err := c.Visit(rawURL); err != nil {
		return nil, err
	}
	c.Wait()

	// set broken links observed
	res.BrokenLinks = broken
	res.UserID = userId
	db := db.GetDB()
	lastInserted, err := db.Exec("INSERT INTO urls (url, html_version, page_title, internal_links_count, external_links_count, broken_links_count, has_login_form,user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", res.URL, res.HTMLVersion, res.Title, res.InternalLinks, res.ExternalLinks, res.BrokenLinks, res.HasLoginForm, res.UserID)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	res.ID, _ = lastInserted.LastInsertId()
	return res, crawlErr
}

func isSameDomain(baseURL, compareURL string) bool {
	base, err1 := url.Parse(baseURL)
	comp, err2 := url.Parse(compareURL)
	if err1 != nil || err2 != nil {
		return false
	}
	return base.Hostname() == comp.Hostname()
}

func handleSuccessfulCrawl(url string) (*models.Url, error) {

	res, err := db.GetUrlByTitle(url)

	if err != nil {
		return &models.Url{}, err
	}
	return res, nil
}
