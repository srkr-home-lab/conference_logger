package main

import "github.com/gin-gonic/gin"

func main() {
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	r.POST("/post_log", func(c *gin.Context) {
	 
	})

	r.Run(":8080")
}
