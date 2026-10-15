from rest_framework import serializers

from .models import Spec, SpecRevision


class SpecRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecRevision
        fields = ["id", "result", "note", "created_at"]


class SpecSerializer(serializers.ModelSerializer):
    revision_count = serializers.IntegerField(source="revisions.count", read_only=True)

    class Meta:
        model = Spec
        fields = ["id", "requirement", "result", "status", "created_at", "updated_at", "revision_count"]
        read_only_fields = ["id", "created_at", "updated_at", "revision_count"]
