package service

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gocolly/colly"
	"github.com/gorilla/websocket"
	"github.com/lape15/sykell-task-root/utils"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

var (
	wsConnections   = make(map[string]*websocket.Conn)
	activeCrawlers  = make(map[string]*colly.Collector)
	activeCancelFns = make(map[string]context.CancelFunc)
	crawlersMutex   sync.Mutex
)

func HandleCrawlWebSocket(c *gin.Context) {

	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
		return
	}

	userID, err := utils.ParseJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}
	fmt.Println("User ID:", userID)
	url := c.Query("url")
	fmt.Println("WebSocket connection for URL:", url)
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}
	crawlersMutex.Lock()
	if existingConn, ok := wsConnections[url]; ok {
		existingConn.Close() // Close old connection
	}
	wsConnections[url] = conn
	crawlersMutex.Unlock()

	// Handle connection lifetime
	defer func() {
		crawlersMutex.Lock()

		if wsConnections[url] == conn {
			delete(wsConnections, url)
		}
		crawlersMutex.Unlock()
		conn.Close()
	}()

	for {
		var msg struct {
			Action string `json:"action"`
			URL    string `json:"url"`
		}
		if err := conn.ReadJSON(&msg); err != nil {
			log.Println("WebSocket read error:", err)
			break
		}

		if msg.Action == "stop" && msg.URL != "" {
			crawlersMutex.Lock()
			if cancel, ok := activeCancelFns[msg.URL]; ok {
				cancel()
				conn.WriteJSON(map[string]string{"status": "stopped", "url": msg.URL})
			} else {
				conn.WriteJSON(map[string]string{"status": "not_found", "message": "No active crawl for URL"})
			}
			crawlersMutex.Unlock()
		}
	}
}

func WSConnectionForURL(url string) *websocket.Conn {
	crawlersMutex.Lock()
	defer crawlersMutex.Unlock()

	conn := wsConnections[url]
	if conn != nil {

		if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
			delete(wsConnections, url)
			return nil
		}
	}
	return conn
}
