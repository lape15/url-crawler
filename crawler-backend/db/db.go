package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/lape15/sykell-task-root/models"
)

var db *sql.DB

func InitializeDb() {

	user := "crawler"
	pass := "crawlerpass"
	host := os.Getenv("MYSQL_HOST")
	dbName := "crawlerdb"
	port := "3306"
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", user, pass, host, port, dbName)
	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("failed to open crawlerdb database: %v", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	fmt.Println("Connected to crawlerdb database")

}

func GetDB() *sql.DB {
	return db
}

func CloseDB() {
	db.Close()
}

func Migrate() {
	db := GetDB()

	_, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(36) PRIMARY KEY,
		username VARCHAR(100) NOT NULL UNIQUE,
		name VARCHAR(100) NOT NULL,
		password_hash TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`)
	if err != nil {
		log.Fatal("Failed to migrate users table:", err)
	}

	_, err = db.Exec(`
CREATE TABLE IF NOT EXISTS urls (
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id VARCHAR(36) NOT NULL,  
	url TEXT NOT NULL,
	html_version VARCHAR(50),
	page_title TEXT,
	internal_links_count INT DEFAULT 0,
	external_links_count INT DEFAULT 0,
	broken_links_count INT DEFAULT 0,
	has_login_form BOOLEAN DEFAULT FALSE,
	status ENUM('queued', 'running', 'done', 'error') DEFAULT 'queued',
	error_message TEXT,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`)

	if err != nil {
		log.Fatal("Failed to migrate urls table:", err)
	}
}

func GetUserByUsername(username string) *models.User {
	db := GetDB()
	query := "SELECT id, username, password_hash FROM users WHERE username = ?"
	row := db.QueryRow(query, username)

	var user models.User
	err := row.Scan(&user.ID, &user.Username, &user.HPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Println("User not found")
		}
		return nil
	}

	return &user
}
