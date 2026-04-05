from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model

from .models import RehabSession, CognitiveGameSession, CognitiveGameProgress
from .serializers import (
    SignupSerializer,
    UserSerializer,
    RegisterPatientSerializer,
    RehabSessionSerializer,
    CognitiveGameSessionSerializer,
    CognitiveGameProgressSerializer,
)

User = get_user_model()


# ── Exercise dictionary (static) ─────────────────────────────
EXERCISES = {
    "pendulum_swing": {
        "display_name": "Pendulum Swing",
        "description": "Gentle gravity-assisted shoulder movement.",
        "landmarks": ["right_shoulder", "right_elbow", "right_wrist"],
        "hold_sec": 0,
        "stages": [
            {"label": "Stage 1 — Gentle", "correct_min": 10, "correct_max": 30, "partial_range": [5, 10]},
            {"label": "Stage 2 — Mid", "correct_min": 25, "correct_max": 50, "partial_range": [15, 25]},
            {"label": "Stage 3 — Full", "correct_min": 40, "correct_max": 70, "partial_range": [25, 40]},
        ],
    },
    "arm_raise": {
        "display_name": "Forward Arm Raise",
        "description": "Raise the arm forward and upward. Keep elbow straight.",
        "landmarks": ["right_hip", "right_shoulder", "right_elbow"],
        "hold_sec": 2,
        "stages": [
            {"label": "Stage 1 — Low", "correct_min": 20, "correct_max": 50, "partial_range": [10, 20]},
            {"label": "Stage 2 — Mid", "correct_min": 40, "correct_max": 80, "partial_range": [20, 40]},
            {"label": "Stage 3 — High", "correct_min": 80, "correct_max": 130, "partial_range": [50, 80]},
        ],
    },
    "shoulder_abduction": {
        "display_name": "Side Arm Lift",
        "description": "Raise the arm out to the side. Keep elbow slightly bent.",
        "landmarks": ["right_hip", "right_shoulder", "right_elbow"],
        "hold_sec": 2,
        "stages": [
            {"label": "Stage 1 — Gentle", "correct_min": 150, "correct_max": 170, "partial_range": [140, 150]},
            {"label": "Stage 2 — Moderate", "correct_min": 130, "correct_max": 155, "partial_range": [120, 130]},
            {"label": "Stage 3 — Full", "correct_min": 110, "correct_max": 140, "partial_range": [100, 110]},
        ],
    },
    "elbow_flexion": {
        "display_name": "Elbow Bend",
        "description": "Slowly bend the elbow, bringing hand toward shoulder.",
        "landmarks": ["right_shoulder", "right_elbow", "right_wrist"],
        "hold_sec": 2,
        "stages": [
            {"label": "Stage 1 — Gentle", "correct_min": 10, "correct_max": 35, "partial_range": [5, 10]},
            {"label": "Stage 2 — Moderate", "correct_min": 30, "correct_max": 60, "partial_range": [15, 30]},
            {"label": "Stage 3 — Full", "correct_min": 60, "correct_max": 100, "partial_range": [40, 60]},
        ],
    },
}


# ── Auth Views ────────────────────────────────────────────────

@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def signup_view(request):
    serializer = SignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(
        {"message": "Account created", "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def login_view(request):
    email = request.data.get("email", "")
    password = request.data.get("password", "")
    user = authenticate(request, email=email, password=password)
    if user is None:
        return Response(
            {"error": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    refresh = RefreshToken.for_user(user)
    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    })


@api_view(["GET"])
def me_view(request):
    return Response(UserSerializer(request.user).data)


# ── Patient Login (by patient_id) ─────────────────────────────

@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def patient_login_view(request):
    """Login with doctor-assigned patient_id + password."""
    patient_id = request.data.get("patient_id", "").strip()
    password = request.data.get("password", "")

    if not patient_id or not password:
        return Response(
            {"error": "Patient ID and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(patient_id=patient_id, role="patient")
    except User.DoesNotExist:
        return Response(
            {"error": "Invalid Patient ID."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.check_password(password):
        return Response(
            {"error": "Invalid password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    refresh = RefreshToken.for_user(user)
    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    })


# ── Register Patient (by doctor) ──────────────────────────────

def _generate_patient_id():
    """Generate a unique NK-XXXXX patient ID."""
    import random
    while True:
        pid = f"NK-{random.randint(10000, 99999)}"
        if not User.objects.filter(patient_id=pid).exists():
            return pid


def _extract_with_gemini(file_bytes, file_name, mime_type):
    """Use Google Gemini to extract patient info from a discharge summary."""
    import google.generativeai as genai
    import os
    import json

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {"error": "GEMINI_API_KEY not set in server environment."}

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")

    prompt = """Analyze this medical discharge summary and extract the following information in JSON format:
{
  "full_name": "patient's full name",
  "age": <integer or null>,
  "gender": "male/female/other or empty string",
  "injury_type": "brief injury type, e.g. shoulder injury, elbow fracture, knee replacement",
  "injury_details": "detailed description of the injury and treatment",
  "suggested_exercises": ["exercise_key_1", "exercise_key_2"],
  "exercise_plan": {
    "sessions_per_day": 1,
    "sets": 3,
    "reps_per_set": 10,
    "hold_secs": 2,
    "break_between_exercises_secs": 60
  }
}

Available exercise keys (choose from these based on injury type):
- "elbow_stretching" — for elbow/arm injuries, stretching exercises
- "lateral_raises" — for shoulder injuries, lateral arm raises
- "cognitive_rehab" — for brain injuries, cognitive impairment, TBI, or any case needing cognitive rehabilitation

Rules for exercise assignment:
- Shoulder injury → ["lateral_raises", "elbow_stretching"]
- Elbow injury → ["elbow_stretching"]
- General upper body → ["lateral_raises", "elbow_stretching"]
- Brain injury / TBI / cognitive impairment → ["cognitive_rehab"]
- If discharge summary mentions cognitive rehabilitation → include "cognitive_rehab"
- If injury is not upper body, still assign ["lateral_raises"] as general rehab.

Return ONLY valid JSON, no markdown formatting, no extra text."""

    try:
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file_name}") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        uploaded = genai.upload_file(tmp_path, mime_type=mime_type)
        response = model.generate_content([prompt, uploaded])

        # Clean up
        os.unlink(tmp_path)

        # Parse JSON from response
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        return json.loads(text)

    except Exception as e:
        return {"error": f"Gemini extraction failed: {str(e)}"}


@api_view(["POST"])
def extract_discharge_view(request):
    """Preview: extract info from discharge summary via Gemini (no user creation)."""
    if request.user.role != "doctor":
        return Response({"error": "Only doctors can extract discharge summaries."},
                        status=status.HTTP_403_FORBIDDEN)

    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return Response({"error": "No file uploaded."},
                        status=status.HTTP_400_BAD_REQUEST)

    file_bytes = uploaded_file.read()
    mime_type = uploaded_file.content_type or "application/octet-stream"
    file_name = uploaded_file.name or "upload"

    result = _extract_with_gemini(file_bytes, file_name, mime_type)

    if "error" in result:
        return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(result)


@api_view(["POST"])
def register_patient_view(request):
    """Doctor registers a patient. Accepts multipart form with optional discharge file."""
    if request.user.role != "doctor":
        return Response({"error": "Only doctors can register patients."},
                        status=status.HTTP_403_FORBIDDEN)

    serializer = RegisterPatientSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    # Generate unique patient ID
    patient_id = _generate_patient_id()

    # Generate a placeholder email from patient_id (patients login with ID, not email)
    email = f"{patient_id.lower().replace('-', '')}@patient.nakshatra.local"

    # Default exercise plan if not provided
    exercise_plan = data.get("exercise_plan") or {
        "sessions_per_day": 1,
        "sets": 3,
        "reps_per_set": 10,
        "hold_secs": 2,
        "break_between_exercises_secs": 60,
    }

    user = User.objects.create_user(
        email=email,
        password=data["password"],
        full_name=data["full_name"],
        role="patient",
        patient_id=patient_id,
        age=data.get("age"),
        gender=data.get("gender", ""),
        injury_type=data.get("injury_type", ""),
        injury_details=data.get("injury_details", ""),
        assigned_exercises=data.get("assigned_exercises", []),
        exercise_plan=exercise_plan,
        registered_by=request.user,
        discharge_summary_text=data.get("discharge_summary_text", ""),
    )

    return Response(
        {
            "message": f"Patient registered successfully.",
            "patient_id": patient_id,
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ── User List (for doctor dashboard) ─────────────────────────

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer

    def get_queryset(self):
        qs = User.objects.all()
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return qs


# ── Rehab Sessions ────────────────────────────────────────────

class RehabSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = RehabSessionSerializer

    def get_queryset(self):
        qs = RehabSession.objects.all()
        user_id = self.request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)
        completed = self.request.query_params.get("completed")
        if completed is not None:
            qs = qs.filter(completed=completed.lower() == "true")
        order = self.request.query_params.get("order", "-session_date")
        qs = qs.order_by(order)
        limit = self.request.query_params.get("limit")
        if limit:
            qs = qs[: int(limit)]
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        existing_count = RehabSession.objects.filter(user=user).count()
        serializer.save(
            user=user,
            session_number=existing_count + 1,
            rehab_day=user.rehab_day,
        )


# ── Cognitive Game Sessions ───────────────────────────────────

class CognitiveSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = CognitiveGameSessionSerializer

    def get_queryset(self):
        qs = CognitiveGameSession.objects.all()
        user_id = self.request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)
        order = self.request.query_params.get("order", "-played_at")
        qs = qs.order_by(order)
        limit = self.request.query_params.get("limit")
        if limit:
            qs = qs[: int(limit)]
        return qs

    def perform_create(self, serializer):
        session = serializer.save(user=self.request.user)
        self._update_progress(session)

    @staticmethod
    def _update_progress(session):
        """Aggregate CognitiveGameProgress after each session save."""
        from django.db.models import Avg, Max, Count

        user = session.user
        game = session.game_name

        agg = CognitiveGameSession.objects.filter(
            user=user, game_name=game
        ).aggregate(
            total=Count("id"),
            avg_score=Avg("cog_score"),
            best=Max("level_reached"),
        )

        # Simple trend: compare last‑3 avg vs previous‑3 avg
        recent = list(
            CognitiveGameSession.objects.filter(user=user, game_name=game)
            .order_by("-played_at")
            .values_list("cog_score", flat=True)[:6]
        )
        if len(recent) >= 6:
            last3 = sum(recent[:3]) / 3
            prev3 = sum(recent[3:6]) / 3
            trend = "improving" if last3 > prev3 + 2 else ("declining" if last3 < prev3 - 2 else "stable")
        elif len(recent) >= 3:
            trend = "stable"
        else:
            trend = "not enough data"

        CognitiveGameProgress.objects.update_or_create(
            user=user,
            game_name=game,
            defaults={
                "sessions_played": agg["total"] or 0,
                "best_level": agg["best"] or 0,
                "avg_cog_score": round(agg["avg_score"] or 0, 1),
                "recent_trend": trend,
            },
        )


# ── Cognitive Game Progress ───────────────────────────────────

class CognitiveProgressListView(generics.ListAPIView):
    serializer_class = CognitiveGameProgressSerializer

    def get_queryset(self):
        qs = CognitiveGameProgress.objects.all()
        user_id = self.request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs


# ── Exercises ─────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def exercises_view(request):
    return Response(EXERCISES)


# ── Exercise Session Proxy (Nakshatra_v3 CV API) ─────────────
import os
import urllib.request
import urllib.error
import json as _json

CV_API_BASE = os.environ.get("CV_API_URL", "http://localhost:8001")


def _cv_request(method: str, path: str, body: dict | None = None):
    """Simple urllib proxy to the Nakshatra_v3 FastAPI service."""
    url = f"{CV_API_BASE}{path}"
    data = _json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"} if body else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return _json.loads(resp.read().decode()), resp.status
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        try:
            return _json.loads(body_text), e.code
        except Exception:
            return {"detail": body_text or str(e)}, e.code
    except urllib.error.URLError as e:
        return {"detail": f"CV API unreachable: {e.reason}"}, 503


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def cv_exercises_view(request):
    """Proxy GET /exercises from the Nakshatra_v3 API."""
    data, code = _cv_request("GET", "/exercises")
    return Response(data, status=code)


@api_view(["POST"])
def exercise_session_start(request):
    """Proxy POST /sessions/start to the CV API."""
    exercise = request.data.get("exercise", "")
    camera = request.data.get("camera", 0)
    data, code = _cv_request("POST", "/sessions/start", {
        "exercise": exercise,
        "camera": camera,
    })
    return Response(data, status=code)


@api_view(["GET"])
def exercise_session_status(request, session_id):
    """Proxy GET /sessions/{id}/status from the CV API."""
    data, code = _cv_request("GET", f"/sessions/{session_id}/status")
    return Response(data, status=code)


@api_view(["GET"])
def exercise_session_result(request, session_id):
    """Proxy GET /sessions/{id}/result from the CV API."""
    data, code = _cv_request("GET", f"/sessions/{session_id}/result")
    return Response(data, status=code)


@api_view(["POST"])
def exercise_session_save(request, session_id):
    """
    Fetch the CV result, then create a RehabSession record.
    Expects the user to be authenticated.
    """
    from datetime import date

    cv_data, cv_code = _cv_request("GET", f"/sessions/{session_id}/result")
    if cv_code != 200:
        return Response(cv_data, status=cv_code)

    result = cv_data.get("result")
    if not result:
        return Response(
            {"error": "No result available for this session."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    total_reps = result.get("total_reps", 0)
    avg_peak = result.get("avg_peak_angle", 0)
    # Convert peak angle to a rough accuracy % (lower angle = better stretch → higher accuracy)
    # For elbow stretching: perfect is ~30°, worst is ~180° → map [30,180] → [100,0]
    # For lateral raises: perfect is ~90°, worst is ~0° → map [0,90] → [0,100]
    exercise = result.get("exercise", "")
    if exercise == "elbow_stretching":
        accuracy = max(0, min(100, (180 - avg_peak) / 1.5))
    elif exercise == "lateral_raises":
        accuracy = max(0, min(100, avg_peak / 0.9))
    else:
        accuracy = 50.0

    # Determine session number
    user = request.user
    existing_count = RehabSession.objects.filter(user=user).count()
    session_number = existing_count + 1

    rehab_session = RehabSession.objects.create(
        user=user,
        session_number=session_number,
        avg_accuracy_pct=round(accuracy, 1),
        total_reps=total_reps,
        rehab_day=user.rehab_day,
        session_date=date.today(),
        completed=True,
    )

    return Response(
        {
            "message": "Session saved successfully.",
            "rehab_session": RehabSessionSerializer(rehab_session).data,
            "cv_result": result,
        },
        status=status.HTTP_201_CREATED,
    )

