"""
Management command to load demo data from shivam.json into the database.
Creates a patient user and populates RehabSession, CognitiveGameSession,
and CognitiveGameProgress with demo data for graph plotting.

Usage:
    python manage.py load_demo_data
    python manage.py load_demo_data --file /path/to/custom.json
"""
import json
import os
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import User, RehabSession, CognitiveGameSession, CognitiveGameProgress


class Command(BaseCommand):
    help = "Load demo patient data from a JSON file (default: shivam.json)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            type=str,
            default=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "shivam.json"),
            help="Path to the JSON data file (default: backend/shivam.json)",
        )

    def handle(self, *args, **options):
        filepath = options["file"]

        if not os.path.exists(filepath):
            self.stderr.write(self.style.ERROR(f"File not found: {filepath}"))
            return

        with open(filepath, "r") as f:
            data = json.load(f)

        patient_data = data["patient"]

        # ── Create or update the patient user ──────────────────────
        user, created = User.objects.update_or_create(
            patient_id=patient_data["patient_id"],
            defaults={
                "email": f"{patient_data['patient_id'].lower().replace('-', '_')}@demo.nakshatra.ai",
                "full_name": patient_data["full_name"],
                "role": "patient",
                "age": patient_data.get("age"),
                "gender": patient_data.get("gender", ""),
                "injury_type": patient_data.get("injury_type", ""),
                "injury_details": patient_data.get("injury_details", ""),
                "assigned_exercises": patient_data.get("assigned_exercises", []),
                "exercise_plan": patient_data.get("exercise_plan", {}),
                "rehab_day": patient_data.get("rehab_day", 0),
                "pain_tolerance": patient_data.get("pain_tolerance", 1.0),
                "overall_cog_score": patient_data.get("overall_cog_score", 0.0),
            },
        )
        user.set_password(patient_data.get("password", "demo123"))
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(
            f"{action} patient: {user.full_name} (ID: {user.patient_id})"
        ))

        # ── Load RehabSessions ─────────────────────────────────────
        rehab_count = 0
        for sess in data.get("rehab_sessions", []):
            RehabSession.objects.update_or_create(
                user=user,
                session_number=sess["session_number"],
                defaults={
                    "session_date": sess["session_date"],
                    "total_reps": sess["total_reps"],
                    "avg_accuracy_pct": sess["avg_accuracy_pct"],
                    "completed": sess.get("completed", True),
                    "rehab_day": sess.get("rehab_day", sess["session_number"]),
                },
            )
            rehab_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"  → Loaded {rehab_count} physical rehab sessions"
        ))

        # ── Load CognitiveGameSessions ─────────────────────────────
        cog_count = 0
        for sess in data.get("cognitive_sessions", []):
            days_ago = sess.get("days_ago", 0)
            played_at = timezone.now() - timedelta(days=days_ago)

            CognitiveGameSession.objects.create(
                user=user,
                game_name=sess["game_name"],
                cog_score=sess["cog_score"],
                level_reached=sess.get("level_reached", 0),
            )
            # Override auto_now_add by using update
            obj = CognitiveGameSession.objects.filter(user=user).order_by("-played_at").first()
            if obj:
                CognitiveGameSession.objects.filter(pk=obj.pk).update(played_at=played_at)

            cog_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"  → Loaded {cog_count} cognitive game sessions"
        ))

        # ── Aggregate CognitiveGameProgress ────────────────────────
        game_names = set(s["game_name"] for s in data.get("cognitive_sessions", []))
        for game_name in game_names:
            sessions = CognitiveGameSession.objects.filter(user=user, game_name=game_name)
            count = sessions.count()
            best = sessions.order_by("-level_reached").first()
            avg_score = sum(s.cog_score for s in sessions) / count if count else 0

            # Determine trend
            if count >= 3:
                recent = list(sessions.order_by("-played_at")[:3])
                scores = [s.cog_score for s in reversed(recent)]
                if scores[-1] > scores[0]:
                    trend = "improving"
                elif scores[-1] < scores[0]:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "not enough data"

            CognitiveGameProgress.objects.update_or_create(
                user=user,
                game_name=game_name,
                defaults={
                    "sessions_played": count,
                    "best_level": best.level_reached if best else 0,
                    "avg_cog_score": round(avg_score, 1),
                    "recent_trend": trend,
                },
            )

        self.stdout.write(self.style.SUCCESS(
            f"  → Aggregated progress for {len(game_names)} cognitive games"
        ))

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Demo data loaded! Login as patient ID: {user.patient_id}, password: {patient_data.get('password', 'demo123')}"
        ))
