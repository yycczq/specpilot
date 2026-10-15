from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Spec, SpecRevision
from .serializers import SpecRevisionSerializer, SpecSerializer
from .services import AIProviderError, analyze_requirement, test_openai_compatible


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        import os

        return Response({"status": "ok", "service": "specpilot-api", "ai_provider": os.getenv("AI_PROVIDER", "mock")})


class OverviewView(APIView):
    def get(self, request):
        return Response(
            {
                "total": Spec.objects.count(),
                "drafts": Spec.objects.filter(status=Spec.Status.DRAFT).count(),
                "reviewed": Spec.objects.filter(status=Spec.Status.REVIEWED).count(),
            }
        )


class SpecListCreateView(APIView):
    def get(self, request):
        specs = Spec.objects.all()
        query = request.query_params.get("q", "").strip()
        if query:
            specs = specs.filter(Q(requirement__icontains=query) | Q(result__title__icontains=query))
        return Response(SpecSerializer(specs[:50], many=True).data)

    def post(self, request):
        requirement = request.data.get("requirement", "")
        if not isinstance(requirement, str) or len(requirement.strip()) < 8:
            return Response({"detail": "请至少输入 8 个字符的需求描述。"}, status=status.HTTP_400_BAD_REQUEST)
        if len(requirement) > 5000:
            return Response({"detail": "需求描述不能超过 5000 个字符。"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = analyze_requirement(requirement.strip(), user_provider=request.data.get("provider"))
        except AIProviderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        spec = Spec.objects.create(requirement=requirement.strip(), result=result)
        return Response(SpecSerializer(spec).data, status=status.HTTP_201_CREATED)


class SpecDetailView(APIView):
    def get(self, request, spec_id):
        return Response(SpecSerializer(get_object_or_404(Spec, id=spec_id)).data)

    def patch(self, request, spec_id):
        spec = get_object_or_404(Spec, id=spec_id)
        new_result = request.data.get("result")
        if not isinstance(new_result, dict) or not isinstance(new_result.get("title"), str):
            return Response({"detail": "请提交包含标题的需求结果对象。"}, status=status.HTTP_400_BAD_REQUEST)
        SpecRevision.objects.create(spec=spec, result=spec.result, note="修改前快照")
        spec.result = new_result
        if request.data.get("status") in {Spec.Status.DRAFT, Spec.Status.REVIEWED}:
            spec.status = request.data["status"]
        spec.save(update_fields=["result", "status", "updated_at"])
        return Response(SpecSerializer(spec).data)


class SpecRevisionListView(APIView):
    def get(self, request, spec_id):
        spec = get_object_or_404(Spec, id=spec_id)
        return Response(SpecRevisionSerializer(spec.revisions.all(), many=True).data)


class ProviderTestView(APIView):
    """Check one caller-owned OpenAI-compatible API config without saving its secret."""

    def post(self, request):
        try:
            result = test_openai_compatible(request.data.get("provider"))
        except AIProviderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)
