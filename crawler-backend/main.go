package main

import (
	"fmt"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/lape15/sykell-task-root/auth"
	"github.com/lape15/sykell-task-root/db"
	"github.com/lape15/sykell-task-root/service"
)

func main() {

	fmt.Println("hello world")
	db.InitializeDb()
	db.Migrate()
	route := gin.Default()
	route.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "DELETE"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))
	route.POST("/signup", auth.Signup)
	route.POST("/login", auth.Login)
	api := route.Group("/crawler")
	api.Use(auth.WithUserId())

	api.POST("/urls", service.CrawlURL)
	api.GET("/urls", service.GetCrawledUrls)
	api.GET("/url", service.GetUrlDetails)
	api.DELETE("/url", service.DeleteCrawled)
	api.POST("/urls/delete", service.DeleteMultipleCrawled)
	api.POST("urls/crawl", service.HandleMultipleUrlCrawl)
	api.GET("/jobs/:jobID/status", service.HandleCrawlStatus)
	api.GET("/jobs/:jobID/result", service.HandleCrawlResult)
	// optional: live push via SSE
	api.GET("/jobs/:jobID/stream", service.HandleCrawlSSE)

	route.GET("/crawl", service.HandleCrawlWebSocket)

	log.Println("Server running at http://localhost:8000")
	route.Run(":8000")
}
