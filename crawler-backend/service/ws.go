package service

import (
	"context"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gocolly/colly"
	"github.com/gorilla/websocket"
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
	url := c.Query("url")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}

	wsConnections[url] = conn
	defer func() {
		crawlersMutex.Lock()
		delete(wsConnections, url)
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
	return wsConnections[url]
}
