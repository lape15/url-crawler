package service

import (
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
