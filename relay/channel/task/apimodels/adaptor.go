package apimodels

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	taskdto "github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel"
	"github.com/QuantumNous/new-api/relay/channel/task/taskcommon"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

const Platform = "apimodels-image"

var models = map[string]bool{
	"gemini-3-pro-image": true, "nano-banana-2-1": true, "nanobanana2": true,
	"gemini-3.1-flash-image-preview": true, "gpt-image-2.6-sunburst": true,
	"gpt-image-2.6-flare": true, "gpt-image-2.5-sunburst": true,
	"gpt-image-2.5-flare": true, "gpt-image-2": true, "gpt-image-2-upscaled": true,
	"doubao-seedream-5-5": true, "doubao-seedream-5-0-pro": true,
	"qwen3-image": true, "qwen3-image-pro": true, "qwen-image-edit-spicy": true, "real-esrgan": true,
}

func Matches(base, model string) bool {
	u, err := url.Parse(base)
	return err == nil && u.Scheme == "https" && strings.EqualFold(u.Host, "api.apimodels.app") && u.User == nil && models[model]
}

type Adaptor struct{ taskcommon.BaseBilling }

func (*Adaptor) Init(*relaycommon.RelayInfo) {}
func (*Adaptor) ValidateRequestAndSetAction(c *gin.Context, info *relaycommon.RelayInfo) *taskdto.TaskError {
	if !Matches(info.ChannelBaseUrl, info.OriginModelName) {
		return service.TaskErrorWrapperLocal(fmt.Errorf("selected channel is not APIMODELS"), "invalid_channel", http.StatusBadRequest)
	}
	_, err := helper.GetAndValidOpenAIImageRequest(c, relayconstant.RelayModeImagesGenerations)
	if err != nil {
		return service.TaskErrorWrapperLocal(err, "invalid_image_request", http.StatusBadRequest)
	}
	if _, err := imageRequestBody(c, info); err != nil {
		return service.TaskErrorWrapperLocal(err, "invalid_image_request", http.StatusBadRequest)
	}
	if info.TaskRelayInfo == nil {
		info.TaskRelayInfo = &relaycommon.TaskRelayInfo{}
	}
	info.Action = "image"
	return nil
}
func (*Adaptor) EstimateBilling(c *gin.Context, _ *relaycommon.RelayInfo) map[string]float64 {
	request, err := helper.GetAndValidOpenAIImageRequest(c, relayconstant.RelayModeImagesGenerations)
	if err != nil || request.N == nil {
		return nil
	}
	return map[string]float64{"image_count": float64(*request.N)}
}
func (*Adaptor) BuildRequestURL(info *relaycommon.RelayInfo) (string, error) {
	u, err := url.Parse(info.ChannelBaseUrl)
	if err != nil {
		return "", err
	}
	u.Path = "/v1/images/generations"
	u.RawQuery = ""
	u.Fragment = ""
	return u.String(), nil
}
func (*Adaptor) BuildRequestHeader(_ *gin.Context, req *http.Request, info *relaycommon.RelayInfo) error {
	req.Header.Set("Authorization", "Bearer "+info.ApiKey)
	req.Header.Set("Content-Type", "application/json")
	return nil
}
func (*Adaptor) BuildRequestBody(c *gin.Context, info *relaycommon.RelayInfo) (io.Reader, error) {
	body, err := imageRequestBody(c, info)
	if err != nil {
		return nil, err
	}
	b, err := common.Marshal(body)
	return bytes.NewReader(b), err
}

func imageRequestBody(c *gin.Context, info *relaycommon.RelayInfo) (map[string]any, error) {
	var body map[string]any
	if err := common.UnmarshalBodyReusableNoCopy(c, &body); err != nil {
		return nil, err
	}
	if body == nil {
		return nil, fmt.Errorf("JSON object required")
	}
	if c.Request.URL.Path == "/v1/chat/completions" {
		var parts []string
		messages, _ := body["messages"].([]any)
		for _, item := range messages {
			message, ok := item.(map[string]any)
			if !ok || message["role"] != "user" {
				continue
			}
			switch content := message["content"].(type) {
			case string:
				parts = append(parts, content)
			case []any:
				for _, item := range content {
					part, ok := item.(map[string]any)
					if ok && part["type"] == "text" {
						if value, ok := part["text"].(string); ok {
							parts = append(parts, value)
						}
					}
				}
			}
		}
		prompt := strings.TrimSpace(strings.Join(parts, "\n"))
		if prompt == "" {
			return nil, fmt.Errorf("chat messages must contain a user text prompt")
		}
		imageBody := map[string]any{"prompt": prompt}
		for _, key := range []string{"n", "size", "quality", "response_format", "style", "background", "output_format", "output_compression", "moderation"} {
			if value, ok := body[key]; ok {
				imageBody[key] = value
			}
		}
		body = imageBody
	}
	body["model"] = info.OriginModelName
	return body, nil
}
func (a *Adaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, body io.Reader) (*http.Response, error) {
	return channel.DoTaskApiRequest(a, c, info, body)
}
func extractNonEmptyString(m map[string]any, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				return strings.TrimSpace(s)
			}
		}
	}
	return ""
}

func extractFirstURL(v any) string {
	switch x := v.(type) {
	case string:
		return strings.TrimSpace(x)
	case []any:
		for _, item := range x {
			switch elem := item.(type) {
			case string:
				if s := strings.TrimSpace(elem); s != "" {
					return s
				}
			case map[string]any:
				if s := extractNonEmptyString(elem, "url", "image_url", "imageUrl"); s != "" {
					return s
				}
			}
		}
	}
	return ""
}

func truncateSnippet(b []byte, limit int) string {
	s := strings.TrimSpace(string(b))
	if len(s) <= limit {
		return s
	}
	return s[:limit] + "..."
}

func (*Adaptor) ParseResponse(_ *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (*channel.TaskSubmitResponse, *taskdto.TaskError) {
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, service.TaskErrorWrapperLocal(err, "invalid_response", http.StatusBadGateway)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return nil, service.TaskErrorWrapperLocal(
			fmt.Errorf("APIMODELS HTTP %d: %s", resp.StatusCode, truncateSnippet(b, 240)),
			"upstream_error",
			resp.StatusCode,
		)
	}
	var raw map[string]any
	if err = common.Unmarshal(b, &raw); err != nil || raw == nil {
		return nil, service.TaskErrorWrapperLocal(
			fmt.Errorf("invalid APIMODELS task response (status=%d): %s", resp.StatusCode, truncateSnippet(b, 240)),
			"invalid_response",
			http.StatusBadGateway,
		)
	}
	if codeVal, hasCode := raw["code"]; hasCode {
		if codeNum, ok := codeVal.(float64); ok && int(codeNum) != 200 && int(codeNum) != 0 {
			msg := extractNonEmptyString(raw, "msg", "message", "error")
			if msg == "" {
				msg = truncateSnippet(b, 240)
			}
			return nil, service.TaskErrorWrapperLocal(
				fmt.Errorf("APIMODELS error code %d: %s", int(codeNum), msg),
				"upstream_error",
				http.StatusBadGateway,
			)
		}
	}

	// 1) 异步任务模式：兼容 data.taskId / data.task_id / data.id 以及顶层 taskId / task_id / id
	taskID := ""
	var dataMap map[string]any
	if dm, ok := raw["data"].(map[string]any); ok {
		dataMap = dm
		taskID = extractNonEmptyString(dm, "taskId", "task_id", "id")
	}
	if taskID == "" {
		taskID = extractNonEmptyString(raw, "taskId", "task_id", "id")
	}
	if taskID != "" {
		publicID := taskID
		if info != nil && info.TaskRelayInfo != nil && info.PublicTaskID != "" {
			publicID = info.PublicTaskID
		}
		return &channel.TaskSubmitResponse{
			UpstreamTaskID: taskID,
			TaskData:       b,
			ClientResponse: map[string]any{
				"code":    200,
				"task_id": publicID,
				"data": map[string]any{
					"taskId":  publicID,
					"task_id": publicID,
				},
			},
		}, nil
	}

	// 2) 同步直出模式：兼容 OpenAI 标准 data:[{url}] 或 data.resultUrls / result_urls / url
	imgURL := ""
	if dataArr, ok := raw["data"].([]any); ok {
		imgURL = extractFirstURL(dataArr)
	}
	if imgURL == "" && dataMap != nil {
		for _, k := range []string{"resultUrls", "result_urls", "urls", "images", "url", "image_url", "imageUrl"} {
			if imgURL = extractFirstURL(dataMap[k]); imgURL != "" {
				break
			}
		}
	}
	if imgURL == "" {
		for _, k := range []string{"resultUrls", "result_urls", "urls", "images", "url", "image_url", "imageUrl"} {
			if imgURL = extractFirstURL(raw[k]); imgURL != "" {
				break
			}
		}
	}
	if imgURL != "" {
		immediateID := ""
		if info != nil && info.TaskRelayInfo != nil {
			immediateID = info.PublicTaskID
		}
		if immediateID == "" {
			immediateID = "apimodels-sync"
		}
		return &channel.TaskSubmitResponse{
			UpstreamTaskID: immediateID,
			TaskData:       b,
			ClientResponse: raw,
			Immediate: &relaycommon.TaskInfo{
				Status:   string(model.TaskStatusSuccess),
				Progress: taskcommon.ProgressComplete,
				Url:      imgURL,
			},
		}, nil
	}

	return nil, service.TaskErrorWrapperLocal(
		fmt.Errorf("invalid APIMODELS task response (status=%d): %s", resp.StatusCode, truncateSnippet(b, 240)),
		"invalid_response",
		http.StatusBadGateway,
	)
}
func (*Adaptor) GetModelList() []string { return nil }
func (*Adaptor) GetChannelName() string { return Platform }
func (*Adaptor) FetchTask(base, key string, task *model.Task, proxy string) (*http.Response, error) {
	if !Matches(base, task.Properties.OriginModelName) || key == "" || task.PrivateData.Key == "" || key != task.PrivateData.Key {
		return nil, fmt.Errorf("invalid APIMODELS polling channel or credential")
	}
	endpoint, err := url.Parse(base)
	if err != nil {
		return nil, err
	}
	endpoint.Path = "/v1/images/generations"
	endpoint.RawQuery = url.Values{"task_id": {task.GetUpstreamTaskID()}}.Encode()
	endpoint.Fragment = ""
	u := endpoint.String()
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		return nil, err
	}
	noRedirects := *client
	noRedirects.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	return noRedirects.Do(req)
}
func (*Adaptor) ParseTaskResult(_ *model.Task, _ *http.Response, body []byte) (*relaycommon.TaskInfo, error) {
	var raw map[string]any
	if err := common.Unmarshal(body, &raw); err != nil || raw == nil {
		return nil, fmt.Errorf("invalid APIMODELS response: %s", truncateSnippet(body, 200))
	}
	if codeVal, hasCode := raw["code"]; hasCode {
		if codeNum, ok := codeVal.(float64); ok && int(codeNum) != 200 && int(codeNum) != 0 {
			return nil, fmt.Errorf("invalid APIMODELS response (code=%d)", int(codeNum))
		}
	}
	dataMap, _ := raw["data"].(map[string]any)
	if dataMap == nil {
		dataMap = raw
	}
	state := strings.ToLower(extractNonEmptyString(dataMap, "state", "status"))
	failMsg := extractNonEmptyString(dataMap, "failMsg", "fail_msg", "error", "message")
	imgURL := ""
	for _, k := range []string{"resultUrls", "result_urls", "urls", "images", "url", "image_url", "imageUrl"} {
		if imgURL = extractFirstURL(dataMap[k]); imgURL != "" {
			break
		}
	}
	result := &relaycommon.TaskInfo{}
	switch state {
	case "completed", "succeeded", "success", "done":
		result.Status = string(model.TaskStatusSuccess)
		result.Url = imgURL
	case "failed", "error", "canceled", "cancelled":
		result.Status = string(model.TaskStatusFailure)
		result.Reason = failMsg
	case "pending", "queued", "submitted":
		result.Status = string(model.TaskStatusQueued)
	case "processing", "running", "in_progress":
		result.Status = string(model.TaskStatusInProgress)
	default:
		if imgURL != "" {
			result.Status = string(model.TaskStatusSuccess)
			result.Url = imgURL
			return result, nil
		}
		return nil, fmt.Errorf("unknown APIMODELS task state: %q", state)
	}
	return result, nil
}
