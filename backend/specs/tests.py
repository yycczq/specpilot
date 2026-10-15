import os
import json
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import Spec


@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "tests"}})
class SpecApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")

    def test_rejects_short_requirements(self):
        response = self.client.post("/api/specs/", {"requirement": "做页面"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Spec.objects.count(), 0)

    @patch.dict(os.environ, {"AI_PROVIDER": "mock"})
    def test_creates_and_lists_a_spec(self):
        response = self.client.post(
            "/api/specs/", {"requirement": "玩家可以提交游戏内的道具问题，并查看处理进度"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "draft")
        self.assertTrue(response.data["result"]["acceptance_criteria"])
        listed = self.client.get("/api/specs/")
        self.assertEqual(len(listed.data), 1)

    @patch.dict(os.environ, {"AI_PROVIDER": "mock"})
    def test_manual_review_saves_a_revision(self):
        created = self.client.post("/api/specs/", {"requirement": "用户可以创建并跟踪一个需求"}, format="json")
        spec_id = created.data["id"]
        edited = dict(created.data["result"])
        edited["summary"] = "经过本人审阅后的说明"
        response = self.client.patch(
            f"/api/specs/{spec_id}/", {"result": edited, "status": "reviewed"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "reviewed")
        revisions = self.client.get(f"/api/specs/{spec_id}/revisions/")
        self.assertEqual(len(revisions.data), 1)
        self.assertNotEqual(revisions.data[0]["result"]["summary"], "经过本人审阅后的说明")

    @patch("specs.views.analyze_requirement")
    def test_byok_spec_generation_does_not_return_the_api_key(self, analyze):
        analyze.return_value = {
            "title": "需求标题",
            "summary": "需求摘要",
            "questions": [],
            "user_stories": [],
            "acceptance_criteria": [],
            "api_endpoints": [],
            "test_cases": [],
            "risks": [],
            "mode": "openai-compatible",
        }
        provider = {
            "base_url": "https://api.example.com/v1",
            "model": "example-model",
            "api_key": "secret-test-key",
        }
        response = self.client.post(
            "/api/specs/", {"requirement": "用户可以创建并跟踪一个需求", "provider": provider}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("secret-test-key", str(response.data))
        self.assertNotIn("secret-test-key", str(Spec.objects.get(id=response.data["id"]).result))
        analyze.assert_called_once_with("用户可以创建并跟踪一个需求", user_provider=provider)

    @patch("specs.views.test_openai_compatible")
    def test_provider_test_returns_only_safe_status(self, test_provider):
        test_provider.return_value = {"status": "ok", "provider": "openai-compatible"}
        response = self.client.post(
            "/api/providers/test/",
            {"provider": {"base_url": "https://api.example.com/v1", "model": "demo", "api_key": "do-not-return"}},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"status": "ok", "provider": "openai-compatible"})
        self.assertNotIn("do-not-return", str(response.data))

    def test_byok_rejects_private_network_addresses(self):
        from .services import AIProviderError, _provider_config

        with self.assertRaises(AIProviderError):
            _provider_config({"base_url": "http://127.0.0.1:8000/v1", "model": "demo", "api_key": "secret"})

    @patch("specs.services._PinnedHTTPSConnection")
    @patch("specs.services._provider_config")
    def test_openai_compatible_request_uses_caller_model_and_key(self, provider_config, connection_factory):
        from .services import _compatible_chat

        provider_config.return_value = {
            "host": "api.example.com",
            "host_header": "api.example.com",
            "port": 443,
            "scheme": "https",
            "path": "/v1/chat/completions",
            "addresses": ["203.0.113.10"],
            "model": "caller-model",
            "api_key": "caller-secret",
        }
        connection = connection_factory.return_value
        response = connection.getresponse.return_value
        response.status = 200
        response.read.return_value = b'{"choices":[{"message":{"content":"OK"}}]}'

        content = _compatible_chat({"provider": "settings"}, [{"role": "user", "content": "test"}], 16)

        self.assertEqual(content, "OK")
        request_args, request_kwargs = connection.request.call_args
        self.assertEqual(request_args, ("POST", "/v1/chat/completions"))
        self.assertEqual(request_kwargs["headers"]["Authorization"], "Bearer caller-secret")
        self.assertEqual(json.loads(request_kwargs["body"])["model"], "caller-model")
