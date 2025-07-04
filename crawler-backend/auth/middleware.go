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

	if userID := r.Header.Get("X-User-ID"); userID != "" {
		return userID, nil
	}

	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return "", fmt.Errorf("missing or invalid Authorization header")
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

	userID, err := utils.ParseJWT(tokenStr)
	if err != nil {
		return "", fmt.Errorf("invalid token")
	}
	return userID, nil
}
