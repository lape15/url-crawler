package models

type User struct {
	Username  string `json:"email"`
	Name      string `json:"name"`
	HPassword string `json:"password"`
	ID        string `json:"id"`
}

type Url struct {
	ID            int64
	URL           string
	HTMLVersion   string
	Title         string
	HeadingsCount map[string]int
	InternalLinks int
	ExternalLinks int
	BrokenLinks   int
	HasLoginForm  bool
	UserID        string
}
