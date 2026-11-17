package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAPIMODELSImageFetchEmptyID(t *testing.T) {
	for _, path := range []string{"/v1/images/generations", "/v1/images/generations?task_id=%20"} {
		t.Run(path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest(http.MethodGet, path, nil)
			APIMODELSImageFetch(c)
			assert.Equal(t, http.StatusBadRequest, recorder.Code)
		})
	}
}

func TestAPIMODELSTextModelUsesFallback(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, "https://api.apimodels.app")
	common.SetContextKey(c, constant.ContextKeyOriginalModel, "gpt-4")
	called := false
	APIMODELSImage(c, func(*gin.Context) { called = true })
	assert.True(t, called)
}
