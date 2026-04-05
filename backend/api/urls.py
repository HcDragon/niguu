from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path("auth/signup/", views.signup_view, name="signup"),
    path("auth/login/", views.login_view, name="login"),
    path("auth/patient-login/", views.patient_login_view, name="patient-login"),
    path("auth/register-patient/", views.register_patient_view, name="register-patient"),
    path("auth/extract-discharge/", views.extract_discharge_view, name="extract-discharge"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", views.me_view, name="me"),

    # Users
    path("users/", views.UserListView.as_view(), name="user-list"),

    # Rehab sessions
    path("rehab-sessions/", views.RehabSessionListCreateView.as_view(), name="rehab-session-list"),

    # Cognitive sessions
    path("cognitive-sessions/", views.CognitiveSessionListCreateView.as_view(), name="cognitive-session-list"),

    # Cognitive progress
    path("cognitive-progress/", views.CognitiveProgressListView.as_view(), name="cognitive-progress-list"),

    # Exercises
    path("exercises/", views.exercises_view, name="exercises"),

    # Exercise sessions (CV API proxy)
    path("cv-exercises/", views.cv_exercises_view, name="cv-exercises"),
    path("exercise-sessions/start/", views.exercise_session_start, name="exercise-session-start"),
    path("exercise-sessions/<str:session_id>/status/", views.exercise_session_status, name="exercise-session-status"),
    path("exercise-sessions/<str:session_id>/result/", views.exercise_session_result, name="exercise-session-result"),
    path("exercise-sessions/<str:session_id>/save/", views.exercise_session_save, name="exercise-session-save"),
]
