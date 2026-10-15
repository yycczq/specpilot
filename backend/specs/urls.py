from django.urls import path

from .views import HealthView, OverviewView, SpecDetailView, SpecListCreateView, SpecRevisionListView


urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("overview/", OverviewView.as_view(), name="overview"),
    path("specs/", SpecListCreateView.as_view(), name="spec-list-create"),
    path("specs/<uuid:spec_id>/", SpecDetailView.as_view(), name="spec-detail"),
    path("specs/<uuid:spec_id>/revisions/", SpecRevisionListView.as_view(), name="spec-revisions"),
]
