"""
Static scholarship data seeded into the application.
In production, this would come from a government data API or a managed database table.
"""
from typing import List

SCHOLARSHIPS = [
    {
        "id": "sc1",
        "name": "Central Sector Scheme of Scholarships",
        "provider": "Ministry of Education, Govt. of India",
        "amount": 12000.0,
        "eligibilityDescription": "Students in top 20 percentile of Class XII from state boards",
        "academicRequirements": "Minimum 80% in Class XII; currently enrolled in UG/PG",
        "incomeRequirements": "Family income ≤ ₹8 lakhs per annum",
        "deadline": "2024-11-30",
        "requiredDocuments": ["Aadhaar Card", "Income Certificate", "Class XII Marksheet", "College ID"],
        "applicationStatus": None,
        "officialUrl": "https://scholarships.gov.in",
        "category": "merit",
        "academicLevel": "undergraduate",
    },
    {
        "id": "sc2",
        "name": "AICTE Pragati Scholarship",
        "provider": "AICTE",
        "amount": 30000.0,
        "eligibilityDescription": "For girl students pursuing technical education",
        "academicRequirements": "Admitted to AICTE-approved institution; no backlog in previous year",
        "incomeRequirements": "Family income ≤ ₹8 lakhs per annum",
        "deadline": "2024-10-31",
        "requiredDocuments": ["Aadhaar Card", "Income Certificate", "Admission Letter", "Bank Account"],
        "applicationStatus": None,
        "officialUrl": "https://www.aicte-india.org/schemes/students-development-schemes/PG-Scholarship",
        "category": "gender",
        "academicLevel": "undergraduate",
    },
    {
        "id": "sc3",
        "name": "Post Matric Scholarship for OBC Students",
        "provider": "Ministry of Social Justice & Empowerment",
        "amount": 20000.0,
        "eligibilityDescription": "OBC students pursuing post-matriculation courses",
        "academicRequirements": "Regular full-time student; satisfactory progress",
        "incomeRequirements": "Family income ≤ ₹1 lakh per annum",
        "deadline": "2024-12-15",
        "requiredDocuments": ["OBC Certificate", "Income Certificate", "Aadhaar", "Marksheets"],
        "applicationStatus": None,
        "officialUrl": "https://scholarships.gov.in",
        "category": "obc",
        "academicLevel": "postgraduate",
    },
    {
        "id": "sc4",
        "name": "HDFC Educational Crisis Scholarship",
        "provider": "HDFC Bank Parivartan",
        "amount": 75000.0,
        "eligibilityDescription": "Students facing financial crisis in education",
        "academicRequirements": "Minimum 55% aggregate; active enrollment",
        "incomeRequirements": "Family income ≤ ₹3.5 lakhs per annum",
        "deadline": "2024-11-15",
        "requiredDocuments": ["Income Certificate", "Aadhaar", "Bank Statement", "Admission Letter"],
        "applicationStatus": None,
        "officialUrl": "https://www.hdfcbank.com/scholarships",
        "category": "need_based",
        "academicLevel": "undergraduate",
    },
]


def check_eligibility(request: dict) -> List[dict]:
    """
    Rule-based eligibility check against the static scholarship list.
    Returns EligibilityResultOut-compatible dicts.
    """
    cgpa = request.get("cgpa", 0)
    family_income = request.get("familyIncome", 0)
    results = []

    for sc in SCHOLARSHIPS:
        # Parse income requirement
        income_limit = None
        inc_req: str = sc["incomeRequirements"]
        if "8 lakh" in inc_req:
            income_limit = 800000
        elif "3.5 lakh" in inc_req:
            income_limit = 350000
        elif "1 lakh" in inc_req:
            income_limit = 100000

        income_ok = income_limit is None or family_income <= income_limit

        # Academic check: rough CGPA → percentage (CGPA*10)
        cgpa_pct = cgpa * 10
        academic_ok = cgpa_pct >= 55  # minimum for most

        criteria_met = []
        if income_ok:
            criteria_met.append("Income criterion met")
        if academic_ok:
            criteria_met.append("Academic score requirement met")
        criteria_met.append("Currently enrolled")

        if income_ok and academic_ok:
            eligibility_status = "likely_eligible"
            explanation = (
                f"Based on your academic performance (CGPA {cgpa}) and family income, "
                f"you appear to meet the eligibility criteria for this scholarship."
            )
        elif academic_ok:
            eligibility_status = "more_information_required"
            explanation = (
                f"You may meet the academic criteria (CGPA {cgpa}), "
                f"but your family income may exceed the limit for this scholarship."
            )
        else:
            eligibility_status = "may_not_be_eligible"
            explanation = (
                f"Based on the criteria provided, you may not meet the minimum requirements "
                f"for this scholarship."
            )

        results.append({
            "scholarship": {
                "name": sc["name"],
                "provider": sc["provider"],
                "amount": sc["amount"],
                "deadline": sc["deadline"],
            },
            "eligibility": {
                "status": eligibility_status,
                "explanation": explanation,
                "matchingCriteria": criteria_met,
            },
            "source": {
                "title": f"{sc['name']} — Official Guidelines",
                "url": sc["officialUrl"],
                "publisher": sc["provider"],
            },
            "relevance": 0.9 if eligibility_status == "likely_eligible" else 0.6,
        })

    # Return top 2 most relevant
    results.sort(key=lambda r: -r["relevance"])
    return results[:2]
