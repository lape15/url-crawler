package models

type User struct {
	Username  string `json:"email"`
	Name      string `json:"name"`
	HPassword string `json:"password"`
	ID        string `json:"id"`
}
