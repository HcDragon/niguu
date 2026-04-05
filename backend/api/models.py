import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", "doctor")
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [("patient", "Patient"), ("doctor", "Doctor")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True, default="")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="patient")
    rehab_day = models.IntegerField(default=0)
    pain_tolerance = models.FloatField(default=1.0)
    overall_cog_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    # Patient-specific fields (set by doctor during registration)
    patient_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True, default="")
    injury_type = models.CharField(max_length=255, blank=True, default="")
    injury_details = models.TextField(blank=True, default="")
    assigned_exercises = models.JSONField(default=list, blank=True)
    exercise_plan = models.JSONField(default=dict, blank=True)
    registered_by = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="registered_patients",
    )
    discharge_summary_text = models.TextField(blank=True, default="")

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.email})"


class RehabSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rehab_sessions")
    session_number = models.IntegerField(default=1)
    avg_accuracy_pct = models.FloatField(default=0.0)
    total_reps = models.IntegerField(default=0)
    rehab_day = models.IntegerField(default=0)
    session_date = models.DateField()
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-session_date", "-session_number"]

    def __str__(self):
        return f"Session {self.session_number} — {self.user.email}"


class CognitiveGameSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cognitive_sessions")
    cog_score = models.FloatField(default=0.0)
    played_at = models.DateTimeField(auto_now_add=True)
    game_name = models.CharField(max_length=100, default="")
    level_reached = models.IntegerField(default=0)

    class Meta:
        ordering = ["-played_at"]

    def __str__(self):
        return f"{self.game_name} — {self.user.email}"


class CognitiveGameProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cognitive_progress")
    game_name = models.CharField(max_length=100)
    sessions_played = models.IntegerField(default=0)
    best_level = models.IntegerField(default=0)
    avg_cog_score = models.FloatField(default=0.0)
    recent_trend = models.CharField(max_length=50, default="not enough data")

    class Meta:
        unique_together = ["user", "game_name"]
        ordering = ["game_name"]

    def __str__(self):
        return f"{self.game_name} progress — {self.user.email}"
