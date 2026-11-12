from apps.core.enums import Role

from .models import User
from .services import UserService

DEMO_PASSWORD = "Password123!"

DEMO_USERS = [
    {"email": "coordinator@siams.local", "full_name": "Cora Coordinator", "role": Role.COORDINATOR},
    {
        "email": "academic@siams.local",
        "full_name": "Alex Academic",
        "role": Role.ACADEMIC_SUPERVISOR,
    },
    {
        "email": "student1@siams.local",
        "full_name": "Sam Student",
        "role": Role.STUDENT,
        "registration_number": "DEMO-001",
        "programme": "BSc Computer Science",
        "year_of_study": 3,
    },
    {
        "email": "student2@siams.local",
        "full_name": "Sara Student",
        "role": Role.STUDENT,
        "registration_number": "DEMO-002",
        "programme": "BSc Information Technology",
        "year_of_study": 3,
    },
]


def seed():
    for spec in DEMO_USERS:
        if User.objects.filter(email__iexact=spec["email"]).exists():
            continue
        user = UserService.create_user(**spec, password=DEMO_PASSWORD, send_invite=False)
        if spec["role"] == Role.COORDINATOR:
            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=["is_staff", "is_superuser"])
