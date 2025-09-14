package service

import (
	"fmt"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/lape15/sykell-task-root/db"
	"github.com/lape15/sykell-task-root/models"
)

var input MultipleCrawledInput

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
