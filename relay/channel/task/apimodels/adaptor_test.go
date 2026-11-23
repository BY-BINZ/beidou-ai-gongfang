package apimodels

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestImageModelsRouteAndSubmit(t *testing.T) {
	models := []string{"gemini-3-pro-image", "nano-banana-2-1", "nanobanana2", "gemini-3.1-flash-image-preview", "gpt-image-2.6-sunburst", "gpt-image-2.6-flare", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare", "gpt-image-2", "gpt-image-2-upscaled", "doubao-seedream-5-5", "doubao-seedream-5-0-pro", "qwen3-image", "qwen3-image-pro", "qwen-image-edit-spicy", "real-esrgan"}
	assert.False(t, Matches("https://api.apimodels.app", "gpt-4"))
	assert.False(t, Matches("https://other.example", models[0]))
	for _, name := range models {
		for _, path := range []string{"/v1/chat/completions", "/v1/images/generations"} {
			t.Run(name+path, func(t *testing.T) {
				require.True(t, Matches("https://api.apimodels.app", name))
				upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					assert.Equal(t, http.MethodPost, r.Method)
					assert.Equal(t, "/v1/images/generations", r.URL.Path)
					var body map[string]any
					b, e := io.ReadAll(r.Body)
					require.NoError(t, e)
					require.NoError(t, common.Unmarshal(b, &body))
					assert.Equal(t, name, body["model"])
					assert.Equal(t, "test", body["prompt"])
					assert.NotContains(t, body, "messages")
					w.Header().Set("Content-Type", "application/json")
					_, _ = w.Write([]byte(`{"code":200,"data":{"taskId":"upstream"}}`))
				}))
				defer upstream.Close()
				c, _ := gin.CreateTestContext(httptest.NewRecorder())
				input := `{"model":"` + name + `","prompt":"test"}`
				if path == "/v1/chat/completions" {
					input = `{"model":"` + name + `","messages":[{"role":"user","content":"test"}],"n":1}`
				}
				c.Request = httptest.NewRequest(http.MethodPost, path, strings.NewReader(input))
				c.Request.Header.Set("Content-Type", "application/json")
				info := &relaycommon.RelayInfo{OriginModelName: name, ChannelMeta: &relaycommon.ChannelMeta{ChannelBaseUrl: upstream.URL, ApiKey: "key"}, TaskRelayInfo: &relaycommon.TaskRelayInfo{}}
				a := &Adaptor{}
				body, e := a.BuildRequestBody(c, info)
				require.NoError(t, e)
				resp, e := a.DoRequest(c, info, body)
				require.NoError(t, e)
				defer resp.Body.Close()
				parsed, taskErr := a.ParseResponse(c, resp, info)
				require.Nil(t, taskErr)
				assert.Equal(t, "upstream", parsed.UpstreamTaskID)
			})
		}
	}
}

func TestPollRejectsUntrustedBaseAndRedirect(t *testing.T) {
	task := &model.Task{Properties: model.Properties{OriginModelName: "gemini-3-pro-image"}, PrivateData: model.TaskPrivateData{Key: "saved", UpstreamTaskID: "private"}}
	adaptor := &Adaptor{}
	_, err := adaptor.FetchTask("https://other.example", "saved", task, "")
	require.Error(t, err)
	_, err = adaptor.FetchTask("https://api.apimodels.app", "wrong", task, "")
	require.Error(t, err)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("redirect must not be followed")
	}))
	defer server.Close()
	previous := http.DefaultClient.Transport
	http.DefaultClient.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
		assert.Equal(t, "Bearer saved", r.Header.Get("Authorization"))
		return &http.Response{StatusCode: http.StatusFound, Header: http.Header{"Location": {server.URL}}, Body: io.NopCloser(strings.NewReader("")), Request: r}, nil
	})
	t.Cleanup(func() { http.DefaultClient.Transport = previous })
	resp, err := adaptor.FetchTask("https://api.apimodels.app", "saved", task, "")
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, http.StatusFound, resp.StatusCode)
}

func TestChatImagePromptValidation(t *testing.T) {
	for _, tc := range []struct {
		body       string
		wantPrompt string
	}{
		{`{"model":"gemini-3-pro-image","messages":[{"role":"user","content":[{"type":"text","text":"draw a tree"}]}],"size":"1024x1024"}`, "draw a tree"},
		{`{"model":"gemini-3-pro-image","messages":[{"role":"assistant","content":"not a prompt"}]}`, ""},
	} {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(tc.body))
		c.Request.Header.Set("Content-Type", "application/json")
		info := &relaycommon.RelayInfo{OriginModelName: "gemini-3-pro-image", ChannelMeta: &relaycommon.ChannelMeta{ChannelBaseUrl: "https://api.apimodels.app"}, TaskRelayInfo: &relaycommon.TaskRelayInfo{}}
		adaptor := &Adaptor{}
		err := adaptor.ValidateRequestAndSetAction(c, info)
		if tc.wantPrompt == "" {
			require.NotNil(t, err)
			continue
		}
		require.Nil(t, err)
		body, buildErr := adaptor.BuildRequestBody(c, info)
		require.NoError(t, buildErr)
		data, readErr := io.ReadAll(body)
		require.NoError(t, readErr)
		var result map[string]any
		require.NoError(t, common.Unmarshal(data, &result))
		assert.Equal(t, tc.wantPrompt, result["prompt"])
		assert.Equal(t, "1024x1024", result["size"])
		assert.NotContains(t, result, "messages")
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestParseResponseVariants(t *testing.T) {
	a := &Adaptor{}
	info := &relaycommon.RelayInfo{TaskRelayInfo: &relaycommon.TaskRelayInfo{PublicTaskID: "pub-123"}}

	cases := []struct {
		name      string
		body      string
		wantID    string
		wantURL   string
		wantError bool
	}{
		{"camel_taskId", `{"code":200,"data":{"taskId":"t-1"}}`, "t-1", "", false},
		{"snake_task_id", `{"code":0,"data":{"task_id":"t-2"}}`, "t-2", "", false},
		{"top_level_id", `{"task_id":"t-3"}`, "t-3", "", false},
		{"sync_openai_data_array", `{"created":1700000000,"data":[{"url":"https://cdn.example/out.png"}]}`, "pub-123", "https://cdn.example/out.png", false},
		{"sync_resultUrls", `{"code":200,"data":{"resultUrls":["https://cdn.example/out2.png"]}}`, "pub-123", "https://cdn.example/out2.png", false},
		{"bad_payload", `{"code":500,"msg":"upstream overloaded"}`, "", "", true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(tc.body)),
			}
			parsed, taskErr := a.ParseResponse(nil, resp, info)
			if tc.wantError {
				require.NotNil(t, taskErr)
				return
			}
			require.Nil(t, taskErr)
			assert.Equal(t, tc.wantID, parsed.UpstreamTaskID)
			if tc.wantURL != "" {
				require.NotNil(t, parsed.Immediate)
				assert.Equal(t, tc.wantURL, parsed.Immediate.Url)
			} else {
				assert.Nil(t, parsed.Immediate)
			}
		})
	}
}
