from django.contrib import admin
from .models import User, RehabSession, CognitiveGameSession, CognitiveGameProgress

admin.site.register(User)
admin.site.register(RehabSession)
admin.site.register(CognitiveGameSession)
admin.site.register(CognitiveGameProgress)
