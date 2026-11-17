package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAPIMODELSFilesRejectsInvalidMetadata(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name        string
		contentType string
		body        string
		status      int
	}{
		{"missing", "application/json", `{}`, http.StatusBadRequest},
		{"no filename", "application/json", `{"contentType":"image/png"}`, http.StatusBadRequest},
		{"unsupported media", "application/json", `{"filename":"a","contentType":"text/plain"}`, http.StatusBadRequest},
		{"negative size", "application/json", `{"filename":"a","contentType":"image/png","fileSize":-1}`, http.StatusBadRequest},
		{"fractional size", "application/json", `{"filename":"a","contentType":"image/png","fileSize":1.5}`, http.StatusBadRequest},
		{"zero size", "application/json", `{"filename":"a","contentType":"image/png","fileSize":0}`, http.StatusBadRequest},
		{"null size", "application/json", `{"filename":"a","contentType":"image/png","fileSize":null}`, http.StatusBadRequest},
		{"base64 field", "application/json", `{"filename":"a","contentType":"image/png","base64":"YWJj"}`, http.StatusBadRequest},
		{"multipart", "multipart/form-data; boundary=test", "--test", http.StatusUnsupportedMediaType},
		{"binary", "application/octet-stream", "binary", http.StatusUnsupportedMediaType},
		{"oversized", "application/json", strings.Repeat("x", 4097), http.StatusRequestEntityTooLarge},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(recorder)
			ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/files", strings.NewReader(tc.body))
			ctx.Request.Header.Set("Content-Type", tc.contentType)
			APIMODELSFiles(ctx)
			assert.Equal(t, tc.status, recorder.Code)
		})
	}
}

func TestAPIMODELSFilesRejectsPut(t *testing.T) {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPut, "/v1/files", strings.NewReader(`{"filename":"a","contentType":"image/png"}`))
	ctx.Request.Header.Set("Content-Type", "application/json")
	APIMODELSFiles(ctx)
	assert.Equal(t, http.StatusMethodNotAllowed, recorder.Code)
}
