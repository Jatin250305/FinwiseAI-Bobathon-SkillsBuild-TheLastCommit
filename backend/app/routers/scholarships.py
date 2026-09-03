from typing import List
from fastapi import APIRouter, Depends
from app.deps import get_current_user
from app.models import User
from app.schemas.scholarship import ScholarshipOut, EligibilityCheckRequest, EligibilityResultOut
from app.services.scholarships import SCHOLARSHIPS, check_eligibility

router = APIRouter(prefix="/scholarships", tags=["scholarships"])


@router.get("", response_model=List[ScholarshipOut])
def list_scholarships(current_user: User = Depends(get_current_user)):
    return [ScholarshipOut(**sc) for sc in SCHOLARSHIPS]


@router.post("/check-eligibility", response_model=List[EligibilityResultOut])
def check_scholarship_eligibility(
    body: EligibilityCheckRequest,
    current_user: User = Depends(get_current_user),
):
    results = check_eligibility(body.model_dump())
    return [EligibilityResultOut(**r) for r in results]
