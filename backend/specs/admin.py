from django.contrib import admin

from .models import Spec, SpecRevision


@admin.register(Spec)
class SpecAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "created_at", "updated_at")
    list_filter = ("status",)
    search_fields = ("requirement",)


@admin.register(SpecRevision)
class SpecRevisionAdmin(admin.ModelAdmin):
    list_display = ("id", "spec", "note", "created_at")
