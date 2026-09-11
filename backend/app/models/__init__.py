# Import all models here so Alembic autogenerate sees them via Base.metadata.
from app.models.user import User  # noqa: F401
from app.models.group import Group  # noqa: F401
from app.models.group_member import GroupMember  # noqa: F401
from app.models.book import Book  # noqa: F401
from app.models.handoff_event import HandoffEvent  # noqa: F401
