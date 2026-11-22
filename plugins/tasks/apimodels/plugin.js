// APIMODELS async image generation.
//
// APIMODELS serves image generation as an asynchronous task API: POST
// /v1/images/generations returns a taskId, and the result is fetched by
// polling GET /v1/images/generations?task_id= until state=completed. The
// same endpoint handles text-to-image and image editing: a prompt alone
// generates, while image_url / image_urls / image_base64 route to editing.
// See https://apimodels.app/docs/gpt-image-2 and
// https://apimodels.app/docs/qwen3-image.
//
// The relay's OpenAI-compatible channel cannot serve these models: it
// passes the upstream reply through as a synchronous response, and
// APIMODELS answers its sync path with "invalid APIMODELS task response"
// instead of an image. This plugin submits the task, polls for the result,
// and renders the delivered image URL as an OpenAI image response.

// Async image models on APIMODELS, with their documented limits.
// GPT Image 2/2.5/2.6 and Nano Banana 2.1 produce one image per task;
// Qwen Image 3.0 produces 1-6. Reference images: GPT up to 16, Nano up
// to 14, Qwen up to 3. Resolutions: GPT and Nano 1K/2K/4K, Qwen 1K/2K.
const GPT_PROFILE = {
  maxN: 1,
  maxInput: 16,
  resolutions: ["1K", "2K", "4K"],
  aspectRatios: ["1:1", "2:3", "3:2", "4:5", "5:4", "4:3", "3:4", "16:9", "9:16", "21:9"],
};
const NANO_PROFILE = {
  maxN: 1,
  maxInput: 14,
  resolutions: ["1K", "2K", "4K"],
  aspectRatios: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9", "1:4", "4:1", "1:8", "8:1"],
};
const QWEN_PROFILE = {
  maxN: 6,
  maxInput: 3,
  resolutions: ["1K", "2K"],
  aspectRatios: ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"],
};
const IMAGE_MODELS = {
  "gpt-image-2": GPT_PROFILE,
  "gpt-image-2.5-flare": GPT_PROFILE,
  "gpt-image-2.5-sunburst": GPT_PROFILE,
  "gpt-image-2.6-flare": GPT_PROFILE,
  "gpt-image-2.6-sunburst": GPT_PROFILE,
  "nano-banana-2-1": NANO_PROFILE,
  "qwen3-image": QWEN_PROFILE,
  "qwen3-image-pro": QWEN_PROFILE,
};
const ALL_MODELS = Object.keys(IMAGE_MODELS);

// APIMODELS allows up to 10 MB per reference image.
const MAX_INPUT_IMAGE_BYTES = 10485760;

const IMAGE_UNIT_LABEL = { en: "image", zh: "张", "zh-TW": "張", fr: "image", ja: "枚", ru: "изображение", vi: "ảnh" };
const IMAGE_COUNT_FIELD = {
  type: "number",
  unit: "count",
  unitLabel: IMAGE_UNIT_LABEL,
  description: { en: "Image generation unit price", zh: "图片生成单价" },
};

export const meta = {
  apiVersion: 1,
  key: "apimodels",
  name: "APIMODELS",
  description: {
    en: "APIMODELS image generation (GPT Image 2.6, Nano Banana, Qwen 3.0)",
    zh: "APIMODELS 异步图片生成（GPT Image 2.6、Nano Banana、千问 3.0）",
  },
  version: "1.0.0",
  author: { name: "Beidou" },
  baseUrl: "https://api.apimodels.app",
  models: ALL_MODELS,
  fetchMode: "per_task",
  upstreams: ["vendor"],
  usageSchema: { image_count: IMAGE_COUNT_FIELD },
  usageProfiles: [{ models: ALL_MODELS, schema: { image_count: IMAGE_COUNT_FIELD } }],
  protocols: [{ name: "openai_image", models: ALL_MODELS }],
};

function trimmed(value) {
  return String(value || "").trim();
}

// Host file placeholders stand in for uploaded edit images; the host inlines
// them as data URLs before the request is sent.
function isFileRef(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && typeof value.__fileRef === "string";
}

function isImageInput(value) {
  return isFileRef(value) || (typeof value === "string" && /^(https?:\/\/|data:image\/)/i.test(value));
}

function modelProfile(model) {
  const key = String(model || "");
  if (!Object.prototype.hasOwnProperty.call(IMAGE_MODELS, key)) throw new Error("unsupported image model: " + model);
  return IMAGE_MODELS[key];
}

function modelOf(ctx) {
  return ctx.upstreamModel || ctx.model || (ctx.requestBody || {}).model;
}

function aspectRatioValue(ratio) {
  const parts = String(ratio).split(":");
  if (parts.length !== 2) return null;
  const width = Number(parts[0]);
  const height = Number(parts[1]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return width / height;
}

// The aspect ratio of the model's supported list nearest to width/height.
// Returns "auto" when no supported ratio is within 3%, so APIMODELS picks
// the shape itself instead of receiving a ratio it cannot serve.
function nearestAspectRatio(profile, width, height) {
  const ratio = width / height;
  let best = null;
  let bestDistance = Infinity;
  for (const candidate of profile.aspectRatios) {
    const distance = Math.abs(Math.log(ratio / aspectRatioValue(candidate)));
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return bestDistance < 0.03 ? best : "auto";
}

// OpenAI size ("1024x1024", or a ratio such as "3:4") becomes APIMODELS'
// aspect_ratio and resolution. An explicit aspect_ratio / resolution from
// the client wins over the derived values.
function convertSize(profile, req) {
  let aspectRatio = trimmed(req.aspect_ratio);
  if (aspectRatio && aspectRatio !== "auto" && !profile.aspectRatios.includes(aspectRatio))
    throw new Error("aspect_ratio " + aspectRatio + " is not supported by " + req.model);
  let resolution = trimmed(req.resolution);
  if (resolution && !profile.resolutions.includes(resolution))
    throw new Error("resolution " + resolution + " is not supported by " + req.model);
  const size = trimmed(req.size);
  if (!size) return { aspectRatio: aspectRatio || "auto", resolution: resolution || "1K" };
  const dims = /^(\d+)\s*x\s*(\d+)$/i.exec(size);
  if (dims) {
    const width = Number(dims[1]);
    const height = Number(dims[2]);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
      throw new Error("size must be width x height");
    if (!aspectRatio) aspectRatio = nearestAspectRatio(profile, width, height);
    if (!resolution) {
      const longest = Math.max(width, height);
      resolution = longest <= 1024 ? "1K" : longest <= 2048 ? "2K" : "4K";
    }
  } else if (/^\d+\s*:\s*\d+$/.test(size)) {
    const ratio = size.replace(/\s/g, "");
    if (!aspectRatio) aspectRatio = profile.aspectRatios.includes(ratio) ? ratio : "auto";
    if (!resolution) resolution = "1K";
  } else if (["1K", "2K", "4K"].includes(size.toUpperCase())) {
    if (!resolution) resolution = size.toUpperCase();
    if (!aspectRatio) aspectRatio = "auto";
  } else throw new Error("size must be width x height, an aspect ratio, or 1K/2K/4K");
  if (!profile.resolutions.includes(resolution)) resolution = profile.resolutions[profile.resolutions.length - 1];
  // 5:4 and 4:5 are 1K-only on GPT Image 2.
  if ((aspectRatio === "5:4" || aspectRatio === "4:5") && profile === GPT_PROFILE) resolution = "1K";
  return { aspectRatio: aspectRatio, resolution: resolution };
}

// The MIME type of a data URL, for image_mime_type.
function dataUrlMime(value) {
  const match = /^data:([^;,]+);base64,/i.exec(String(value || ""));
  return match ? match[1] : "image/jpeg";
}

// Split reference images into HTTP URLs and data references (data URLs or
// host file placeholders, which the host inlines as data URLs).
function splitReferenceImages(images) {
  const http = [];
  const data = [];
  for (const image of images) {
    if (isFileRef(image)) data.push(image);
    else if (typeof image === "string" && /^https?:\/\//i.test(image)) http.push(image);
    else if (typeof image === "string" && /^data:/i.test(image)) data.push(image);
    else throw new Error("image must be an HTTP URL or Base64 data URL");
  }
  return { http: http, data: data };
}

// Validate the normalized request and build the APIMODELS JSON body. The
// same endpoint serves text-to-image and image editing: reference images
// route the request to editing, so generations and edits share this path.
function convertRequest(ctx) {
  const req = ctx.requestBody || {};
  const model = modelOf(ctx);
  const profile = modelProfile(model);
  const prompt = trimmed(req.prompt);
  if (!prompt) throw new Error("prompt is required");
  const n = req.n === undefined || req.n === null ? 1 : req.n;
  if (!Number.isInteger(n) || n < 1 || n > profile.maxN)
    throw new Error(profile.maxN === 1 ? "n must be 1 for this model" : "n must be an integer between 1 and " + profile.maxN);
  const images = Array.isArray(req.images) ? req.images : [];
  if (images.length > profile.maxInput)
    throw new Error("too many input images for this model: at most " + profile.maxInput);
  for (const image of images) {
    if (!isImageInput(image)) throw new Error("image must be an HTTP URL or Base64 data URL");
  }
  const size = convertSize(profile, req);
  const body = { model: model, prompt: prompt, aspect_ratio: size.aspectRatio, resolution: size.resolution };
  // Qwen Image 3.0 takes n (1-6); GPT Image and Nano Banana produce one
  // image per task and take no n.
  if (profile === QWEN_PROFILE) body.n = n;
  const refs = splitReferenceImages(images);
  const total = refs.http.length + refs.data.length;
  if (total === 1) {
    if (refs.http.length) body.image_url = refs.http[0];
    else {
      body.image_base64 = refs.data[0];
      body.image_mime_type = isFileRef(refs.data[0]) ? trimmed(refs.data[0].mimeType) || "image/png" : dataUrlMime(refs.data[0]);
    }
  } else if (total > 1) {
    // APIMODELS accepts data URIs in image_urls too (auto-wrapped).
    body.image_urls = refs.http.concat(refs.data);
  }
  if (req.output_format !== undefined) {
    if (!["png", "jpeg", "webp"].includes(req.output_format)) throw new Error("output_format must be png, jpeg or webp");
    // Only GPT Image documents output_format; Qwen Image outputs PNG.
    if (profile === GPT_PROFILE) body.output_format = req.output_format;
  }
  if (req.negative_prompt !== undefined) {
    if (typeof req.negative_prompt !== "string") throw new Error("negative_prompt must be a string");
    if (profile === QWEN_PROFILE) body.negative_prompt = req.negative_prompt;
  }
  return { body: body, action: total ? "image_to_image" : "text_to_image", inputImages: total, count: n };
}

export function buildSubmitRequest(ctx) {
  const converted = convertRequest(ctx);
  return {
    url: ctx.baseUrl + "/v1/images/generations",
    method: "POST",
    headers: { Authorization: "Bearer " + ctx.apiKey, "Content-Type": "application/json" },
    body: converted.body,
    action: converted.action,
    responseType: "json",
  };
}

export function parseSubmitResponse(ctx, resp) {
  const body = resp.body || {};
  if (body.code !== undefined && body.code !== 200) throw new Error(String(body.msg || "APIMODELS error " + body.code));
  const data = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : {};
  if (typeof data.taskId === "string" && data.taskId) return { taskId: data.taskId, taskData: body };
  // A vendor answering synchronously returns an OpenAI-format image reply
  // instead of a task id; settle it immediately.
  const images = resultImageUrls(body);
  if (images.length) {
    const taskId = ctx.publicTaskId || body.id || body.request_id;
    if (!taskId) throw new Error("missing synchronous image request id");
    return { taskId: taskId, taskData: body, immediate: { status: "SUCCESS", progress: "100%", url: images[0] } };
  }
  throw new Error("APIMODELS submit response has no taskId");
}

export function extractUsage(ctx) {
  return { image_count: convertRequest(ctx).count };
}

// Legacy per-call pricing settles immediate (synchronous) results here;
// asynchronous tasks settle through extractUsageOnComplete instead.
export function extractUsageOnSubmit(ctx, body) {
  const count = countDeliveredImages(body || {});
  return count === undefined ? {} : { image_count: count };
}

export function extractUsageOnComplete(task, taskResult, body) {
  const count = countDeliveredImages(body || {});
  if (count === undefined) return {};
  const profile = IMAGE_MODELS[String((task && (task.upstreamModel || task.model)) || "")];
  if (profile && count > profile.maxN) throw new Error("invalid upstream image count");
  return { image_count: count };
}

export function buildQueryRequest(ctx) {
  return {
    url: ctx.baseUrl + "/v1/images/generations?task_id=" + encodeURIComponent(ctx.taskId),
    method: "GET",
    headers: { Authorization: "Bearer " + ctx.apiKey },
  };
}

export function parseTaskResult(ctx, body) {
  const data = (body && body.data && typeof body.data === "object" && !Array.isArray(body.data)) ? body.data : {};
  const state = data.state;
  if (state === "pending") return { status: "QUEUED" };
  if (state === "processing") return { status: "IN_PROGRESS" };
  if (state === "completed") {
    const images = resultImageUrls(body);
    if (!images.length) return { status: "FAILURE", reason: "image task succeeded without any images" };
    return { status: "SUCCESS", url: images[0] };
  }
  if (state === "failed") return { status: "FAILURE", reason: trimmed(data.failMsg) || trimmed(body.msg) || "task failed" };
  return { status: "UNKNOWN", reason: "unrecognized state: " + String(state || "") };
}

// Image URLs from an APIMODELS task reply (data.resultUrls, else
// data.images[].url) or an OpenAI-format image reply (data[].url).
function resultImageUrls(body) {
  const urls = [];
  const data = (body && body.data) || {};
  if (Array.isArray(data.resultUrls)) {
    for (const url of data.resultUrls) if (typeof url === "string" && url) urls.push(url);
  }
  if (!urls.length && Array.isArray(data.images)) {
    for (const image of data.images) {
      if (image && typeof image.url === "string" && image.url) urls.push(image.url);
    }
  }
  if (!urls.length && Array.isArray(body.data)) {
    for (const entry of body.data) {
      if (entry && typeof entry.url === "string" && entry.url) urls.push(entry.url);
      else if (entry && typeof entry.b64_json === "string" && entry.b64_json) urls.push("data:image/png;base64," + entry.b64_json);
    }
  }
  return urls;
}

// Delivered image count, preferring the upstream count when the reply
// carries one. A zero or inconsistent count returns undefined so the host
// keeps the reservation instead of guessing.
function countDeliveredImages(body) {
  const urls = resultImageUrls(body);
  if (!urls.length) return undefined;
  const data = (body && body.data) || {};
  const reported = data.image_count !== undefined ? data.image_count : undefined;
  if (reported !== undefined) {
    if (!Number.isInteger(reported) || reported < 0 || reported > 6 || (urls.length && reported === 0)) throw new Error("invalid upstream image count");
    return reported;
  }
  return urls.length;
}

// One OpenAI ImageResponse entry from a delivered image URL.
function imageDatum(image) {
  if (/^https?:\/\//i.test(image)) return { url: image };
  const match = /^data:[^;,]*;base64,(.*)$/s.exec(image);
  return { b64_json: match ? match[1] : image };
}

export const protocols = {
  // OpenAI Images API. The host pins ctx.model, waits for the task to
  // become terminal and honors response_format itself; the plugin maps the
  // request onto APIMODELS' async image endpoint and renders data[] from
  // the delivered result URLs.
  openai_image: {
    decodeRequest: function (ctx) {
      const model = trimmed(ctx.model);
      if (!model) throw new Error("model is required");
      let req = {};
      const uploads = [];
      if (ctx.body && ctx.body.kind === "json") {
        req = ctx.body.value;
        if (!req || typeof req !== "object" || Array.isArray(req)) throw new Error("request body must be an object");
      } else if (ctx.body && ctx.body.kind === "multipart") {
        const fields = ctx.body.fields || {};
        for (const name of Object.keys(fields)) {
          if (fields[name].length > 1) throw new Error(name + " must be provided once");
          req[name] = fields[name][0];
        }
        for (const key of ["n", "seed"]) {
          if (req[key] !== undefined) req[key] = Number(req[key]);
        }
        for (const file of ctx.body.files || []) {
          // APIMODELS has no mask parameter; a mask cannot be honored.
          if (file.field === "mask") throw new Error("mask is not supported by APIMODELS");
          if (/^image(\[\d*\])?$/.test(file.field)) {
            uploads.push({ __fileRef: file.ref, encoding: "dataUrl", mimeType: trimmed(file.mimeType) || "image/png", maxBytes: MAX_INPUT_IMAGE_BYTES });
          }
        }
      } else throw new Error("JSON or multipart body required");
      if (req.stream !== undefined && req.stream !== false && req.stream !== "false")
        throw new Error("stream is not supported; the complete image response is returned once all images are generated");
      if (req.response_format !== undefined && req.response_format !== "url" && req.response_format !== "b64_json")
        throw new Error("response_format must be url or b64_json");
      const requestBody = { model: model, prompt: typeof req.prompt === "string" ? req.prompt : "" };
      if (!trimmed(requestBody.prompt)) throw new Error("prompt is required");
      requestBody.n = req.n === undefined || req.n === null ? 1 : req.n;
      if (!Number.isInteger(requestBody.n) || requestBody.n < 1) throw new Error("n must be a positive integer");
      const images = [];
      for (const image of [].concat(req.image === undefined ? [] : req.image, req.images === undefined ? [] : req.images)) {
        if (isImageInput(image) || (typeof image === "string" && trimmed(image))) images.push(typeof image === "string" ? trimmed(image) : image);
        else throw new Error("image must be an HTTP URL or Base64 data URL");
      }
      for (const upload of uploads) images.push(upload);
      if (ctx.operation === "edit" && !images.length) throw new Error("image is required");
      if (images.length) requestBody.images = images;
      for (const key of ["size", "aspect_ratio", "resolution", "output_format", "negative_prompt"]) {
        if (Object.prototype.hasOwnProperty.call(req, key)) requestBody[key] = req[key];
      }
      // The model may be a mapped alias; final validation runs after channel selection.
      return { kind: "submit", model: model, action: images.length ? "image_to_image" : "text_to_image", requestBody: requestBody };
    },
    render: function (ctx, task) {
      const data = [];
      for (const image of resultImageUrls(task.data || {})) data.push(imageDatum(image));
      return { created: task.created_at, data: data };
    },
  },
};
