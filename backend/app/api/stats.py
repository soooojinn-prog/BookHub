from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_membership
from app.models.user import User
from app.schemas.stats import GroupStats
from app.services.stats import compute_group_stats

router = APIRouter(tags=["stats"])


@router.get("/groups/{group_id}/stats", response_model=GroupStats)
def group_stats(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GroupStats:
    require_membership(db, group_id, current_user.id)
    return compute_group_stats(db, group_id)
