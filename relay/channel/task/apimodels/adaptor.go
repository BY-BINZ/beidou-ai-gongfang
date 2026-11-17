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
func (*Adaptor) ParseResponse(_ *gin.Context, resp *http.Response, _ *relaycommon.RelayInfo) (*channel.TaskSubmitResponse, *taskdto.TaskError) {
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, service.TaskErrorWrapperLocal(err, "invalid_response", http.StatusBadGateway)
	}
	var result struct {
		Code int `json:"code"`
		Data struct {
			TaskID string `json:"taskId"`
		} `json:"data"`
	}
	if err = common.Unmarshal(b, &result); err != nil || result.Code != 200 || result.Data.TaskID == "" {
		return nil, service.TaskErrorWrapperLocal(fmt.Errorf("invalid APIMODELS task response"), "invalid_response", http.StatusBadGateway)
	}
	return &channel.TaskSubmitResponse{UpstreamTaskID: result.Data.TaskID, TaskData: b}, nil
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
	var response struct {
		Code int `json:"code"`
		Data struct {
			State      string   `json:"state"`
			ResultURLs []string `json:"resultUrls"`
			FailMsg    string   `json:"failMsg"`
		} `json:"data"`
	}
	if err := common.Unmarshal(body, &response); err != nil {
		return nil, err
	}
	if response.Code != 200 {
		return nil, fmt.Errorf("invalid APIMODELS response")
	}
	result := &relaycommon.TaskInfo{}
	switch strings.ToLower(response.Data.State) {
	case "completed":
		result.Status = string(model.TaskStatusSuccess)
		if len(response.Data.ResultURLs) > 0 {
			result.Url = response.Data.ResultURLs[0]
		}
	case "failed":
		result.Status = string(model.TaskStatusFailure)
		result.Reason = response.Data.FailMsg
	case "pending", "queued":
		result.Status = string(model.TaskStatusQueued)
	case "processing", "running":
		result.Status = string(model.TaskStatusInProgress)
	default:
		return nil, fmt.Errorf("unknown APIMODELS task state")
	}
	return result, nil
}
