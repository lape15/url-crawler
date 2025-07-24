package service

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

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
	// crawlersMutex   sync.Mutex
	crawlersMutex sync.RWMutex
)

func handleCancellation(conn *websocket.Conn, decodedUrl string) {
	crawlersMutex.Lock()
	defer crawlersMutex.Unlock()

	if cancel, exists := activeCancelFns[decodedUrl]; exists {

		cancel()

		if collector, exists := activeCrawlers[decodedUrl]; exists {
			done := make(chan struct{})
			go func() {
				collector.Wait()
				close(done)
			}()

			select {
			case <-done:
			case <-time.After(500 * time.Millisecond):
			}
		}

		conn.WriteJSON(gin.H{
			"status":  "cancelled",
			"message": "Crawl successfully cancelled",
			"url":     decodedUrl,
		})

	} else {
		conn.WriteJSON(gin.H{
			"status":  "error",
			"message": "No active crawl found for URL",
		})
	}
}

func HandleCrawlWebSocket(c *gin.Context) {

	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
		return
	}
	//_________________/--\ might not need this code  __________________/\
	// userID, err := utils.ParseJWT(token)
	// if err != nil {
	// 	c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
	// 	return
	// }
	// fmt.Println("User ID:", userID)

	encodedUrl := c.Query("url")
	url, err := url.QueryUnescape(encodedUrl)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL encoding"})
		return
	}
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
		conn.WriteControl(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, "crawl completed"),
			time.Now().Add(5*time.Second),
		)
		conn.Close()
	}()

	for {
		var msg struct {
			Action string `json:"action"`
			URL    string `json:"url"`
		}
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		if err := conn.ReadJSON(&msg); err != nil {
			if !websocket.IsCloseError(err, websocket.CloseNormalClosure) {
				log.Println("WebSocket read error:", err)
			}
			break
		}

		if msg.Action == "cancel" {
			fmt.Println("Cancelling crawl for URL:", msg.Action)
			handleCancellation(conn, msg.URL)
		}
	}
}

func WSConnectionForURL(rawUrl string) *websocket.Conn {
	crawlersMutex.RLock()
	defer crawlersMutex.RUnlock()
	return wsConnections[rawUrl] // Assume URL is already decoded when stored
}
