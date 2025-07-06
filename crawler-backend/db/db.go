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
	url TEXT NOT NULL UNIQUE,
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

func GetUrlsByUserId(userId string) ([]models.Url, error) {
	db := GetDB()
	query := "SELECT id, url, html_version, page_title, internal_links_count, external_links_count, broken_links_count, has_login_form, status, error_message FROM urls WHERE user_id = ?"
	rows, err := db.Query(query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var urls []models.Url
	for rows.Next() {
		var url models.Url
		err := rows.Scan(&url.ID, &url.URL, &url.HTMLVersion, &url.Title, &url.InternalLinks, &url.ExternalLinks, &url.BrokenLinks, &url.HasLoginForm)
		if err != nil {
			return nil, err
		}
		urls = append(urls, url)
	}
	return urls, nil
}

func GetUrlByTitle(link string) *models.Url {
	db := GetDB()
	query := "SELECT id, url, html_version, page_title, internal_links_count, external_links_count, broken_links_count, has_login_form, FROM urls WHERE page_title = ?"
	row := db.QueryRow(query, link)

	var url models.Url
	err := row.Scan(&url.ID, &url.URL, &url.HTMLVersion, &url.Title, &url.InternalLinks, &url.ExternalLinks, &url.BrokenLinks, &url.HasLoginForm)
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Println("Url not found")
		}
		return nil
	}

	return &url
}

func DeleteUrlByTitle(title string) error {
	db := GetDB()
	query := "DELETE FROM urls WHERE page_title = ?"
	_, err := db.Exec(query, title)
	if err != nil {
		return err
	}
	return nil
}
