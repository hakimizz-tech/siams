from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Finalize an internship period (Team Alpha, placements)."

    def add_arguments(self, parser):
        parser.add_argument("period_id")

    def handle(self, *args, **options):
        raise CommandError("Not implemented yet: delivered with apps.placements.")
