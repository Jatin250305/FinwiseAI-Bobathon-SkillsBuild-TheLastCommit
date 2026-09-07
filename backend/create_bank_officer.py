from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models import User, ROLE_BANK_OFFICER
from app.core.security import hash_password

def main():
    db = SessionLocal()
    email = "officer@finwise.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        new_user = User(
            email=email,
            full_name="Bank Officer",
            hashed_password=hash_password("BankOfficer123!"),
            role=ROLE_BANK_OFFICER,
            is_email_verified=True,
            auth_provider="local"
        )
        db.add(new_user)
        db.commit()
        print(f"Created bank officer: {email}")
    else:
        user.hashed_password = hash_password("BankOfficer123!")
        user.role = ROLE_BANK_OFFICER
        user.is_email_verified = True
        db.commit()
        print(f"Updated bank officer: {email}")

if __name__ == "__main__":
    main()
