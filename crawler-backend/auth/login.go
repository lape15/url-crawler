package auth

import (
	"encoding/json"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/lape15/sykell-task-root/db"
	"github.com/lape15/sykell-task-root/utils"
)

type Credential struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func Login(c *gin.Context) {
	var credential Credential
	err := json.NewDecoder(c.Request.Body).Decode(&credential)

	if err != nil {
		c.JSON(404, gin.H{"error": "Invalid request"})
		return
	}

	user := db.GetUserByUsername(credential.Username)
	fmt.Println(user)
	if user == nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	doesMatch := utils.ComparePassword(user.HPassword, credential.Password)

	if !doesMatch {
		c.JSON(401, gin.H{"error": "Invalid password"})
		return
	}

	token, err := utils.GenerateJWT(user.ID, user.Username)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate token"})
		return
	}
	c.JSON(200, gin.H{"message": "User logged in successfully", "token": token, "id": user.ID})
}
