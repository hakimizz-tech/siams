import time

from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError, connections


class Command(BaseCommand):
    help = "Block until the default database accepts connections."

    def add_arguments(self, parser):
        parser.add_argument("--timeout", type=int, default=60)

    def handle(self, *args, **options):
        deadline = time.monotonic() + options["timeout"]
        while True:
            try:
                connections["default"].ensure_connection()
                break
            except OperationalError:
                if time.monotonic() >= deadline:
                    raise CommandError("Database not available before the timeout.") from None
                self.stdout.write("Waiting for database...")
                time.sleep(1)
        self.stdout.write(self.style.SUCCESS("Database ready"))
