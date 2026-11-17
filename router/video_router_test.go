package router

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/jsplugin"
	"github.com/QuantumNous/new-api/plugins"
	"github.com/QuantumNous/new-api/relay/channel/task/apimodels"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVideoGenerationPollRoutesRequireAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	SetVideoRouter(engine)
	for _, path := range []string{
		"/v1/video/generations?task_id=task_123",
		"/v1/video/generations/task_123",
	} {
		t.Run(path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			engine.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))
			assert.Equal(t, http.StatusUnauthorized, recorder.Code)
		})
	}
}

type apimodelsRoundTrip func(*http.Request) (*http.Response, error)

func (f apimodelsRoundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestAPIMODELSFilesNoChargeOrKeyLeak(t *testing.T) {
	setupRelayRouterTestDB(t)
	require.NoError(t, model.DB.AutoMigrate(&model.Channel{}, &model.Log{}))
	user := model.User{Username: "files-owner", Status: common.UserStatusEnabled, Group: "default", Quota: 1000}
	require.NoError(t, model.DB.Create(&user).Error)
	require.NoError(t, model.DB.Create(&model.Token{UserId: user.Id, Key: "filesauth", Status: common.TokenStatusEnabled, ExpiredTime: -1, UnlimitedQuota: true}).Error)
	base := "https://api.apimodels.app"
	channel := model.Channel{Type: constant.ChannelTypeOpenAI, Key: "private-files-key", BaseURL: &base, Status: common.ChannelStatusEnabled}
	require.NoError(t, model.DB.Create(&channel).Error)
	require.NoError(t, model.DB.Create(&model.Ability{Group: "default", Model: "gemini-3-pro-image", ChannelId: channel.Id, Enabled: true}).Error)
	previous := http.DefaultTransport
	http.DefaultTransport = apimodelsRoundTrip(func(r *http.Request) (*http.Response, error) {
		assert.Equal(t, "/v1/files", r.URL.Path)
		assert.Equal(t, "Bearer private-files-key", r.Header.Get("Authorization"))
		return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"key":"private-files-key"}`)), Request: r}, nil
	})
	t.Cleanup(func() { http.DefaultTransport = previous })
	engine := gin.New()
	SetRelayRouter(engine)
	r := httptest.NewRequest(http.MethodPost, "/v1/files", strings.NewReader(`{"filename":"a.png","contentType":"image/png"}`))
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("Authorization", "Bearer sk-filesauth")
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, r)
	assert.Equal(t, http.StatusBadGateway, w.Code, w.Body.String())
	assert.NotContains(t, w.Body.String(), "private-files-key")
	var got model.User
	require.NoError(t, model.DB.First(&got, user.Id).Error)
	assert.Equal(t, 1000, got.Quota)
	assert.Zero(t, got.UsedQuota)
	var count int64
	require.NoError(t, model.DB.Model(&model.Log{}).Count(&count).Error)
	assert.Zero(t, count)
}

func TestAPIMODELSAuthenticatedPollAndBilling(t *testing.T) {
	setupRelayRouterTestDB(t)
	require.NoError(t, model.DB.AutoMigrate(&model.Channel{}, &model.Task{}, &model.Log{}))
	db, err := model.DB.DB()
	require.NoError(t, err)
	db.SetMaxOpenConns(1)
	user := model.User{Username: "image-owner", AffCode: "owner-code", Status: common.UserStatusEnabled, Group: "default", Quota: 800, UsedQuota: 200}
	require.NoError(t, model.DB.Create(&user).Error)
	other := model.User{Username: "image-other", AffCode: "other-code", Status: common.UserStatusEnabled, Group: "default", Quota: 1000}
	require.NoError(t, model.DB.Create(&other).Error)
	for _, token := range []model.Token{{UserId: user.Id, Key: "imageowner", Status: common.TokenStatusEnabled, ExpiredTime: -1, UnlimitedQuota: true}, {UserId: other.Id, Key: "imageother", Status: common.TokenStatusEnabled, ExpiredTime: -1, UnlimitedQuota: true}} {
		require.NoError(t, model.DB.Create(&token).Error)
	}
	base := "https://api.apimodels.app"
	channel := model.Channel{Type: constant.ChannelTypeOpenAI, Key: "wrong-key\nother-key", BaseURL: &base, Status: common.ChannelStatusEnabled, UsedQuota: 200}
	require.NoError(t, model.DB.Create(&channel).Error)
	for _, id := range []string{"success", "failure"} {
		task := model.Task{TaskID: id, Platform: apimodels.Platform, UserId: user.Id, Group: "default", ChannelId: channel.Id, Quota: 100, Status: model.TaskStatusSubmitted, Properties: model.Properties{OriginModelName: "gemini-3-pro-image"}, PrivateData: model.TaskPrivateData{Key: "saved-key", UpstreamTaskID: id + "-private", BillingContext: &model.TaskBillingContext{PerCallBilling: true}}}
		task.SetData(map[string]any{"code": 200, "data": map[string]any{"taskId": id + "-private"}})
		require.NoError(t, model.DB.Create(&task).Error)
	}
	var mu sync.Mutex
	var calls int
	ready := make(chan struct{})
	oldTransport := http.DefaultClient.Transport
	http.DefaultClient.Transport = apimodelsRoundTrip(func(r *http.Request) (*http.Response, error) {
		assert.Equal(t, "api.apimodels.app", r.URL.Host)
		assert.Equal(t, "Bearer saved-key", r.Header.Get("Authorization"))
		id := r.URL.Query().Get("task_id")
		if id == "success-private" {
			mu.Lock()
			calls++
			if calls == 2 {
				close(ready)
			}
			mu.Unlock()
			<-ready
		}
		body := `{"code":200,"data":{"taskId":"` + id + `","state":"completed","resultUrls":["https://cdn.example/image.png"]}}`
		if id == "failure-private" {
			body = `{"code":200,"data":{"taskId":"failure-private","state":"failed","failCode":"bad","failMsg":"failed","retryable":false}}`
		}
		return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	})
	t.Cleanup(func() { http.DefaultClient.Transport = oldTransport })
	engine := gin.New()
	SetRelayRouter(engine)
	request := func(path, token string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodGet, path, nil)
		if token != "" {
			r.Header.Set("Authorization", "Bearer sk-"+token)
		}
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, r)
		return w
	}
	for _, path := range []string{"/v1/images/generations?task_id=success", "/v1/images/generations/success"} {
		assert.Equal(t, http.StatusUnauthorized, request(path, "").Code)
		assert.Equal(t, http.StatusBadRequest, request(path, "imageother").Code)
	}
	assert.Equal(t, http.StatusBadRequest, request("/v1/images/generations?task_id=%20", "imageowner").Code)
	results := make(chan *httptest.ResponseRecorder, 2)
	for _, path := range []string{"/v1/images/generations?task_id=success", "/v1/images/generations/success"} {
		go func() { results <- request(path, "imageowner") }()
	}
	for range 2 {
		w := <-results
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		assert.Contains(t, w.Body.String(), `"state":"completed"`)
		assert.Contains(t, w.Body.String(), `"taskId":"success"`)
		assert.Contains(t, w.Body.String(), `"resultUrls"`)
		assert.NotContains(t, w.Body.String(), "saved-key")
	}
	for _, path := range []string{"/v1/images/generations/success", "/v1/images/generations?task_id=success", "/v1/images/generations/failure", "/v1/images/generations?task_id=failure"} {
		w := request(path, "imageowner")
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		if strings.Contains(path, "failure") {
			assert.Contains(t, w.Body.String(), `"failCode":"bad"`)
			assert.Contains(t, w.Body.String(), `"retryable":false`)
		}
	}
	var got model.User
	require.NoError(t, model.DB.First(&got, user.Id).Error)
	assert.Equal(t, 900, got.Quota)
	assert.Equal(t, 100, got.UsedQuota)
	var logs []model.Log
	require.NoError(t, model.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	assert.Equal(t, model.LogTypeRefund, logs[0].Type)
	assert.Equal(t, 100, logs[0].Quota)
}

func TestGetOpenAIVideoRouteRendersJimengTask(t *testing.T) {
	gin.SetMode(gin.TestMode)

	previousDB := model.DB
	previousDatabaseType := common.MainDatabaseType()
	previousLogDatabaseType := common.LogDatabaseType()
	previousSQLitePath := common.SQLitePath
	previousMasterNode := common.IsMasterNode
	previousRedisEnabled := common.RedisEnabled
	common.SQLitePath = t.TempDir() + "/router-video.db"
	common.IsMasterNode = false
	common.RedisEnabled = false
	t.Setenv("SQL_DSN", "")
	require.NoError(t, model.InitDB())
	database := model.DB
	require.NoError(t, database.AutoMigrate(&model.User{}, &model.Token{}, &model.Channel{}, &model.Task{}))
	t.Cleanup(func() {
		sqlDB, closeErr := database.DB()
		require.NoError(t, closeErr)
		require.NoError(t, sqlDB.Close())
		model.DB = previousDB
		common.SetDatabaseTypes(previousDatabaseType, previousLogDatabaseType)
		common.SQLitePath = previousSQLitePath
		common.IsMasterNode = previousMasterNode
		common.RedisEnabled = previousRedisEnabled
	})

	require.NoError(t, database.Create(&model.User{
		Id:          91,
		Username:    "jimeng-fetch-user",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Quota:       100,
		Group:       "default",
		AuthVersion: 1,
	}).Error)
	require.NoError(t, database.Create(&model.Token{
		Id:             1,
		UserId:         91,
		Key:            "jimengfetch",
		Status:         common.TokenStatusEnabled,
		Name:           "jimeng fetch",
		ExpiredTime:    -1,
		UnlimitedQuota: true,
	}).Error)
	require.NoError(t, database.Create(&model.Channel{
		Id:     17,
		Type:   constant.ChannelTypeJimeng,
		Key:    "unused",
		Status: common.ChannelStatusEnabled,
		Name:   "jimeng fetch",
		Models: "jimeng_vgfm_t2v_l20",
		Group:  "default",
	}).Error)

	task := &model.Task{
		CreatedAt: 1710000000,
		UpdatedAt: 1710000060,
		TaskID:    "task_jimeng_public",
		Platform:  constant.TaskPlatform("jimeng"),
		UserId:    91,
		Group:     "default",
		ChannelId: 17,
		Status:    model.TaskStatusSuccess,
		Progress:  "100%",
		PrivateData: model.TaskPrivateData{
			ResultURL: "data:video/mp4;base64,ZGF0YQ==",
		},
	}
	task.SetData(map[string]any{
		"code": 10000,
		"data": map[string]any{
			"status":    "done",
			"task_id":   "jimeng-private-1",
			"video_url": "https://cdn.example/video.mp4",
		},
		"message": "success",
	})
	require.NoError(t, database.Create(task).Error)

	engine := gin.New()
	SetVideoRouter(engine)
	SetTaskPluginProtocolRouter(engine)
	for _, path := range []string{"/v1/video/generations?task_id=task_jimeng_public", "/v1/video/generations/task_jimeng_public"} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		request.Header.Set("Authorization", "Bearer sk-jimengfetch")
		recorder := httptest.NewRecorder()
		engine.ServeHTTP(recorder, request)
		assert.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
		assert.Contains(t, recorder.Body.String(), "task_jimeng_public")
	}
	requestEmpty := httptest.NewRequest(http.MethodGet, "/v1/video/generations?task_id=%20", nil)
	requestEmpty.Header.Set("Authorization", "Bearer sk-jimengfetch")
	emptyRecorder := httptest.NewRecorder()
	engine.ServeHTTP(emptyRecorder, requestEmpty)
	assert.Equal(t, http.StatusBadRequest, emptyRecorder.Code)
	request := httptest.NewRequest(http.MethodGet, "/v1/videos/task_jimeng_public", nil)
	request.Header.Set("Authorization", "Bearer sk-jimengfetch")
	recorder := httptest.NewRecorder()

	engine.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var response struct {
		ID          string `json:"id"`
		Object      string `json:"object"`
		Status      string `json:"status"`
		Progress    int    `json:"progress"`
		CreatedAt   int64  `json:"created_at"`
		CompletedAt int64  `json:"completed_at"`
	}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
	assert.Equal(t, "task_jimeng_public", response.ID)
	assert.Equal(t, "video", response.Object)
	assert.Equal(t, "completed", response.Status)
	assert.Equal(t, 100, response.Progress)
	assert.Equal(t, int64(1710000000), response.CreatedAt)
	assert.Equal(t, int64(1710000060), response.CompletedAt)
	assert.NotContains(t, recorder.Body.String(), "cdn.example")
	assert.NotContains(t, recorder.Body.String(), "jimeng-private-1")

	for _, testCase := range []struct {
		name          string
		authorization string
		query         string
		wantStatus    int
	}{
		{name: "missing credential rejected", wantStatus: http.StatusUnauthorized},
		{name: "access rejected", query: "?access=not-a-video-credential", wantStatus: http.StatusUnauthorized},
		{name: "bearer accepted", authorization: "Bearer sk-jimengfetch", wantStatus: http.StatusOK},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			request := httptest.NewRequest(
				http.MethodGet,
				"/v1/videos/task_jimeng_public/content"+testCase.query,
				nil,
			)
			if testCase.authorization != "" {
				request.Header.Set("Authorization", testCase.authorization)
			}
			recorder := httptest.NewRecorder()
			engine.ServeHTTP(recorder, request)
			assert.Equal(t, testCase.wantStatus, recorder.Code, recorder.Body.String())
			if testCase.wantStatus == http.StatusOK {
				assert.Equal(t, "data", recorder.Body.String())
			}
		})
	}
}

func TestGetOpenAIVideoRouteHandsNativeXAITaskToPluginQuery(t *testing.T) {
	setupRelayRouterTestDB(t)
	require.NoError(t, model.DB.AutoMigrate(&model.Channel{}, &model.Task{}))
	require.NoError(t, model.DB.Create(&model.User{Id: 92, Username: "xai-fetch-user", Status: common.UserStatusEnabled, Group: "default", Quota: 100}).Error)
	require.NoError(t, model.DB.Create(&model.Token{UserId: 92, Key: "xaifetch", Status: common.TokenStatusEnabled, ExpiredTime: -1, UnlimitedQuota: true}).Error)
	for taskID, requestPath := range map[string]string{"task_xai_native": "/v1/videos/generations", "task_xai_pinned": "/xai/v1/videos/generations", "task_xai_openai": "/v1/videos"} {
		task := &model.Task{
			CreatedAt:  1710000000,
			UpdatedAt:  1710000060,
			TaskID:     taskID,
			Platform:   constant.TaskPlatform("xai"),
			UserId:     92,
			Group:      "default",
			Status:     model.TaskStatusSuccess,
			Progress:   "100%",
			Properties: model.Properties{OriginModelName: "grok-imagine-video"},
			PrivateData: model.TaskPrivateData{
				UpstreamTaskID: "xai-private-1",
				Execution: &model.TaskExecutionSnapshot{
					RequestPath: requestPath,
					TaskPlugin:  &model.TaskPluginSnapshot{Key: "xai"},
				},
			},
		}
		task.SetData(map[string]any{
			"request_id": "xai-private-1",
			"status":     "done",
			"model":      "grok-imagine-video",
			"video":      map[string]any{"url": "https://cdn.example/xai.mp4", "duration": 8},
		})
		require.NoError(t, model.DB.Create(task).Error)
	}

	engine := gin.New()
	SetVideoRouter(engine)
	SetTaskPluginProtocolRouter(engine)
	source, err := plugins.Source("xai")
	require.NoError(t, err)
	registry := jsplugin.NewRegistry()
	_, err = registry.RegisterFactory(source, jsplugin.Options{Key: "xai"})
	require.NoError(t, err)
	require.NoError(t, registry.SetGenerationPreparer(newPluginGenerationBuilder(engine.Routes(), nil, productionPluginRouteHandlers).prepare))
	require.Empty(t, registry.RoutingErrors())
	previousRegistry := defaultPluginDispatcher.registry
	defaultPluginDispatcher.registry = registry
	t.Cleanup(func() { defaultPluginDispatcher.registry = previousRegistry })

	for _, testCase := range []struct {
		taskID     string
		wantStatus string
		wantObject any
	}{
		// Submitted on the xAI route: xAI's own query response.
		{taskID: "task_xai_native", wantStatus: "done"},
		// The same under /xai.
		{taskID: "task_xai_pinned", wantStatus: "done"},
		// Submitted through POST /v1/videos: the OpenAI video object.
		{taskID: "task_xai_openai", wantStatus: "completed", wantObject: "video"},
	} {
		t.Run(testCase.taskID, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/v1/videos/"+testCase.taskID, nil)
			request.Header.Set("Authorization", "Bearer sk-xaifetch")
			recorder := httptest.NewRecorder()
			engine.ServeHTTP(recorder, request)

			require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
			var response map[string]any
			require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
			assert.Equal(t, testCase.wantStatus, response["status"])
			assert.Equal(t, testCase.wantObject, response["object"])
			assert.NotContains(t, recorder.Body.String(), "xai-private-1")
		})
	}
}
