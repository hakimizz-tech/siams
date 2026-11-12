class SafeSelectors:
    def __init__(self):
        self.unavailable: set[str] = set()

    def call(self, name, func, *args, default=None, **kwargs):
        """Call `func`; on NotImplementedError remember `name` and return `default`."""
        try:
            return func(*args, **kwargs)
        except NotImplementedError:
            self.unavailable.add(name)
            return default
