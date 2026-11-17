package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func SetVideoRouter(router *gin.Engine) {
	videoSharedRouter := router.Group("/v1")
	videoSharedRouter.Use(middleware.RouteTag("relay"))
	videoSharedRouter.Use(middleware.TokenAuth())
	videoSharedRouter.Use(middleware.SystemPerformanceCheck())
	videoSharedRouter.POST(
		"/video/generations",
		middleware.PinTaskPluginEndpoint(),
		middleware.TaskPluginEndpointOnly(middleware.ModelRequestRateLimit()),
		middleware.PrepareTaskPluginEndpoint(),
		middleware.Distribute(),
		func(c *gin.Context) {
			controller.RelayTaskPluginEndpoint(c, controller.RelayTask)
		},
	)

	videoV1Router := router.Group("/v1")
	videoV1Router.Use(middleware.RouteTag("relay"))
	videoV1Router.Use(func(c *gin.Context) {
		if c.Request.Method == "GET" && c.Request.URL.Path == "/v1/video/generations" {
			c.Params = append(c.Params, gin.Param{Key: "task_id", Value: c.Query("task_id")})
		}
		c.Next()
	})
	videoV1Router.Use(middleware.TokenAuth(), func(c *gin.Context) {
		if c.Request.Method == http.MethodGet && strings.HasPrefix(c.Request.URL.Path, "/v1/video/generations") && strings.TrimSpace(c.Param("task_id")) == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "task_id is required"})
			return
		}
		c.Next()
	}, middleware.Distribute())
	{
		videoV1Router.GET("/video/generations", controller.RelayTaskFetch)
		videoV1Router.GET("/video/generations/:task_id", controller.RelayTaskFetch)
		videoV1Router.POST("/videos/:video_id/remix", controller.RelayTask)
	}
}
