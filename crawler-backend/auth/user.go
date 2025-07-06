package auth

import (
	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lape15/sykell-task-root/db"
	"github.com/lape15/sykell-task-root/models"
	"github.com/lape15/sykell-task-root/utils"
)

type UserCredential struct {
	Username string `json:"username"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

func Signup(c *gin.Context) {
	var userCredential UserCredential
	err := json.NewDecoder(c.Request.Body).Decode(&userCredential)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}
	alreadyExists := db.GetUserByUsername(userCredential.Username)

	if alreadyExists != nil {
		c.JSON(400, gin.H{"error": "User already exists"})
		return
	}
	hashedPassword := utils.HashPassword(userCredential.Password)
	UserId := uuid.New().String()
	user := models.User{
		Username:  userCredential.Username,
		Name:      userCredential.Name,
		HPassword: hashedPassword,
		ID:        UserId,
	}

	db := db.GetDB()
	db.Exec("INSERT INTO users (id, username, name, password_hash) VALUES (?, ?, ?, ?)", user.ID, user.Username, user.Name, user.HPassword)

	token, err := utils.GenerateJWT(user.ID, user.Username)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate token"})
		return
	}
	c.JSON(200, gin.H{"message": "User created successfully", "token": token, "id": user.ID})
}
