from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.core.utils.modules import iter_app_modules


class Command(BaseCommand):
    help = "Run each app's optional seed() hook (apps/<app>/seed.py), in INSTALLED_APPS order."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Allow when DEBUG is off.")

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError("Refusing to seed with DEBUG off. Use --force if you mean it.")
        seeded = 0
        for module in iter_app_modules(settings.LOCAL_APPS, "seed"):
            seed = getattr(module, "seed", None)
            if callable(seed):
                self.stdout.write(f"Seeding {module.__name__}")
                seed()
                seeded += 1
        self.stdout.write(self.style.SUCCESS(f"Seed complete ({seeded} app(s) seeded)"))
