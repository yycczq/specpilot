# SpecPilot REST API

The API is served by Django REST Framework. With the local Docker Compose setup, use `http://localhost:8000` as the base URL. Requests and responses use JSON.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health/` | Service status and server-side default provider name. |
| `GET` | `/api/overview/` | Total, draft, and reviewed counts. |
| `GET` | `/api/specs/?q=keyword` | List up to 50 recent specs; `q` searches requirement text and result title. |
| `POST` | `/api/specs/` | Analyze a requirement and save its draft. |
| `GET` | `/api/specs/{id}/` | Read a spec. |
| `PATCH` | `/api/specs/{id}/` | Save a reviewed result and record the previous result as a revision. |
| `GET` | `/api/specs/{id}/revisions/` | List saved prior versions. |
| `POST` | `/api/providers/test/` | Send a small request to check an OpenAI-compatible API configuration. |

## Generate with your own API

`provider` is optional. If omitted, SpecPilot uses the server's `AI_PROVIDER` setting. When provided, it must contain an OpenAI-compatible Chat Completions endpoint, model ID, and API key:

```bash
curl -X POST http://localhost:8000/api/specs/ \
  -H 'Content-Type: application/json' \
  -d '{
    "requirement": "玩家可以提交游戏内问题并查询处理进度",
    "provider": {
      "base_url": "https://api.openai.com/v1",
      "model": "your-model-id",
      "api_key": "your-api-key"
    }
  }'
```

The API key is accepted for the current request only. It is not written to the database, cache, or response. BYOK results are not cached so different accounts cannot share cached output. The requirement and generated result are saved as a Spec, as they are for normal `POST /api/specs/` requests.

To test a provider before generating a spec:

```bash
curl -X POST http://localhost:8000/api/providers/test/ \
  -H 'Content-Type: application/json' \
  -d '{
    "provider": {
      "base_url": "https://api.openai.com/v1",
      "model": "your-model-id",
      "api_key": "your-api-key"
    }
  }'
```

The test response is `{"status":"ok","provider":"openai-compatible"}`. Provider error bodies and credentials are not returned to callers.

## Review and revisions

```bash
curl -X PATCH http://localhost:8000/api/specs/SPEC_ID/ \
  -H 'Content-Type: application/json' \
  -d '{"result":{"title":"Reviewed title","summary":"Reviewed summary"},"status":"reviewed"}'
```

In a full client, send the complete result object returned from `GET /api/specs/{id}/`; the shortened object above is only a shape example. Each successful patch stores the previous result in the revisions endpoint.

## Limits and deployment

- Requirement input is limited to 5,000 characters. Generated JSON responses are limited to 2 MB.
- BYOK supports OpenAI-compatible `POST /chat/completions`; provider-specific request formats such as Anthropic Messages are not accepted by this endpoint.
- BYOK targets must use public HTTPS. HTTP is allowed only for `localhost` development. DNS answers are checked and pinned to public IPs to prevent requests to private network services.
- The current prototype does not authenticate users or isolate stored Specs. Do not expose it publicly until authentication, per-user authorization, rate limits, and production secret/logging controls are added.
- A BYOK API key crosses the browser-to-SpecPilot connection and is then sent to the configured provider. Use HTTPS for deployed SpecPilot and provide only keys you control.
