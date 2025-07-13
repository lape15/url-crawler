package auth

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lape15/sykell-task-root/utils"
)

func WithUserId() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := extractUserIDFromRequest(c.Request)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized User: " + err.Error(),
			})
			c.Abort()
			return
		}

		// Store userID in context for handlers to retrieve
		c.Set("userID", userID)
		c.Next()
	}
}

func extractUserIDFromRequest(r *http.Request) (string, error) {
	// 1. Check header first
	if userID := r.Header.Get("X-User-ID"); userID != "" {
		return userID, nil
	}

	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if userID, err := utils.ParseJWT(tokenStr); err == nil {
			return userID, nil
		}
	}

	// 2. Fallback: check for token in query string (for WebSocket)
	queryToken := r.URL.Query().Get("token")
	if queryToken != "" {
		userID, err := utils.ParseJWT(queryToken)
		if err != nil {
			return "", fmt.Errorf("invalid token in query: %w", err)
		}
		return userID, nil
	}

	return "", fmt.Errorf("missing authentication token")
}
