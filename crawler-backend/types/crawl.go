package types

type CrawlResult struct {
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
