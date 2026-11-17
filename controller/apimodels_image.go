package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel/task/apimodels"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
)

// APIMODELSImage dispatches only after the channel has been selected.
func APIMODELSImage(c *gin.Context, fallback gin.HandlerFunc) {
	base := common.GetContextKeyString(c, constant.ContextKeyChannelBaseUrl)
	name := common.GetContextKeyString(c, constant.ContextKeyOriginalModel)
	if (c.Request.URL.Path == "/v1/images/generations" || c.Request.URL.Path == "/v1/chat/completions") && apimodels.Matches(base, name) {
		c.Set("platform", apimodels.Platform)
		RelayTask(c)
		return
	}
	fallback(c)
}

func APIMODELSImageFetch(c *gin.Context) {
	id := strings.TrimSpace(c.Param("task_id"))
	if id == "" {
		id = strings.TrimSpace(c.Query("task_id"))
	}
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "task_id is required"})
		return
	}
	task, exists, err := model.GetByTaskId(c.GetInt("id"), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "task lookup failed"})
		return
	}
	if !exists || task.Platform != apimodels.Platform || !task.ResultRetrievable() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "task_not_exist"})
		return
	}
	if err = service.PollOwnedTask(c.Request.Context(), &apimodels.Adaptor{}, task); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "task poll failed"})
		return
	}
	task, exists, err = model.GetByTaskId(c.GetInt("id"), id)
	if err != nil || !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "task lookup failed"})
		return
	}
	var response map[string]any
	if common.Unmarshal(task.Data, &response) != nil || response == nil {
		response = map[string]any{"code": 200, "data": map[string]any{"state": "pending"}}
	}
	if data, ok := response["data"].(map[string]any); ok {
		data["taskId"] = task.TaskID
	}
	c.JSON(http.StatusOK, response)
}
