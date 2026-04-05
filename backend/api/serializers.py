from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import RehabSession, CognitiveGameSession, CognitiveGameProgress

User = get_user_model()


# ── Auth ──────────────────────────────────────────────────────
class SignupSerializer(serializers.Serializer):
    """Doctor-only signup — patients are registered by doctors."""
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            role="doctor",
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "role",
            "rehab_day", "pain_tolerance", "overall_cog_score",
            "patient_id", "age", "gender", "injury_type", "injury_details",
            "assigned_exercises", "exercise_plan",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RegisterPatientSerializer(serializers.Serializer):
    """Used by doctors to register a patient after Gemini extraction."""
    full_name = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True, min_length=6)
    age = serializers.IntegerField(required=False, allow_null=True)
    gender = serializers.CharField(max_length=20, required=False, allow_blank=True)
    injury_type = serializers.CharField(max_length=255, required=False, allow_blank=True)
    injury_details = serializers.CharField(required=False, allow_blank=True)
    assigned_exercises = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    exercise_plan = serializers.DictField(required=False, default=dict)
    discharge_summary_text = serializers.CharField(required=False, allow_blank=True)


# ── Data ──────────────────────────────────────────────────────
class RehabSessionSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = RehabSession
        fields = [
            "id", "user_id", "session_number", "avg_accuracy_pct",
            "total_reps", "rehab_day", "session_date", "completed",
            "created_at",
        ]
        read_only_fields = ["id", "user_id", "created_at"]


class CognitiveGameSessionSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = CognitiveGameSession
        fields = [
            "id", "user_id", "cog_score", "played_at",
            "game_name", "level_reached",
        ]
        read_only_fields = ["id", "user_id", "played_at"]


class CognitiveGameProgressSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = CognitiveGameProgress
        fields = [
            "id", "user_id", "game_name", "sessions_played",
            "best_level", "avg_cog_score", "recent_trend",
        ]
        read_only_fields = ["id", "user_id"]
