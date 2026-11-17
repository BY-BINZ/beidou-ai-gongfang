package controller

import (
	"bytes"
	"io"
	"mime"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

// APIMODELSFiles proxies metadata only. The client sends the file directly to R2.
func APIMODELSFiles(c *gin.Context) {
	if c.Request.Method != http.MethodPost {
		c.AbortWithStatus(http.StatusMethodNotAllowed)
		return
	}
	mediaType, _, err := mime.ParseMediaType(c.GetHeader("Content-Type"))
	if err != nil || mediaType != "application/json" {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "application/json required"})
		return
	}
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, 4097))
	if err != nil || len(body) > 4096 {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "request body too large"})
		return
	}
	var fields map[string]common.RawMessage
	if common.Unmarshal(body, &fields) != nil || len(fields) < 2 || len(fields) > 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid metadata"})
		return
	}
	for key := range fields {
		if key != "filename" && key != "contentType" && key != "fileSize" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid metadata"})
			return
		}
	}
	var filename, contentType string
	if common.Unmarshal(fields["filename"], &filename) != nil || common.Unmarshal(fields["contentType"], &contentType) != nil ||
		strings.TrimSpace(filename) == "" || len(filename) > 255 || strings.ContainsAny(filename, "/\\\r\n\x00") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid metadata"})
		return
	}
	mimeType, params, err := mime.ParseMediaType(contentType)
	if err != nil || len(params) != 0 || mimeType != contentType ||
		!(strings.HasPrefix(mimeType, "image/") || strings.HasPrefix(mimeType, "video/") || strings.HasPrefix(mimeType, "audio/")) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid content type"})
		return
	}
	if raw, exists := fields["fileSize"]; exists {
		var size int64
		if string(raw) == "null" || common.Unmarshal(raw, &size) != nil || size <= 0 || size > 9007199254740991 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file size"})
			return
		}
	}

	group := common.GetContextKeyString(c, constant.ContextKeyUsingGroup)
	groups := []string{group}
	if group == "auto" {
		groups = service.GetRequestAutoGroups(c, common.GetContextKeyString(c, constant.ContextKeyUserGroup))
	}
	limits, _ := common.GetContextKey(c, constant.ContextKeyTokenModelLimit)
	modelLimits, _ := limits.(map[string]bool)
	constraints := service.GetChannelConstraints(c)
	pin, pinned, _ := constraints.ResolvedPin()
	for _, ability := range model.GetAllEnableAbilities() {
		if !slices.Contains(groups, ability.Group) ||
			(common.GetContextKeyBool(c, constant.ContextKeyTokenModelLimitEnabled) && !middleware.TokenModelLimitAllows(modelLimits, ability.Model)) ||
			(pinned && ability.ChannelId != pin.ChannelId) {
			continue
		}
		channel, err := model.CacheGetChannel(ability.ChannelId)
		if err != nil || channel == nil || channel.Status != common.ChannelStatusEnabled {
			continue
		}
		base, err := url.Parse(channel.GetBaseURL())
		if err != nil || base.Scheme != "https" || base.Host != "api.apimodels.app" || base.User != nil ||
			base.RawQuery != "" || base.Fragment != "" || (base.Path != "" && base.Path != "/v1") {
			continue
		}
		if matches, _ := model.ChannelSatisfiesFilters(channel, ability.Model, constraints.Filters); !matches {
			continue
		}
		key, _, keyErr := channel.GetNextEnabledKey()
		if keyErr != nil || key == "" {
			continue
		}
		request, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, "https://api.apimodels.app/v1/files", bytes.NewReader(body))
		if err != nil {
			break
		}
		request.Header.Set("Authorization", "Bearer "+key)
		request.Header.Set("Content-Type", "application/json")
		client := &http.Client{Timeout: 30 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
		response, err := client.Do(request)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "upstream request failed"})
			return
		}
		defer response.Body.Close()
		responseBody, err := io.ReadAll(io.LimitReader(response.Body, 65537))
		if err != nil || len(responseBody) > 65536 || bytes.Contains(responseBody, []byte(key)) {
			c.JSON(http.StatusBadGateway, gin.H{"error": "invalid upstream response"})
			return
		}
		c.Header("Content-Type", "application/json")
		c.Status(response.StatusCode)
		_, _ = c.Writer.Write(responseBody)
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "no available APIMODELS channel"})
}
