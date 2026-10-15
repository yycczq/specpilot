import os
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
