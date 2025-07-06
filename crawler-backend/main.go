package main

import (
	"fmt"
	"log"

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
	route.POST("/signup", auth.Signup)
	route.POST("/login", auth.Login)
	api := route.Group("/crawler")
	api.Use(auth.WithUserId())

	api.POST("/urls", service.CrawlURL)
	api.GET("/ws/crawl", service.HandleCrawlWebSocket)

	log.Println("Server running at http://localhost:8000")
	route.Run(":8000")
}
