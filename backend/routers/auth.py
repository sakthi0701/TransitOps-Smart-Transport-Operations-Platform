"""
Auth router — login endpoint + reusable get_current_user dependency.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from pydantic import BaseModel

from backend.database import get_session
from backend.models.user import User, UserRead
from backend.auth.jwt import verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


# ── Request / Response Schemas ─────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    email: str


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, session: Session = Depends(get_session)) -> LoginResponse:
    """
    Authenticates a user and returns a JWT.
    Seed users (see seed.py):
      manager@demo.com / demo1234  (Manager)
      driver@demo.com  / demo1234  (Dispatcher)
      safety@demo.com  / demo1234  (Safety)
      finance@demo.com / demo1234  (Finance)
    """
    user = session.exec(select(User).where(User.email == request.email)).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    })

    return LoginResponse(
        access_token=token,
        role=user.role,
        user_id=user.id,
        email=user.email,
    )


@router.get("/me", response_model=UserRead)
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session),
) -> UserRead:
    """Returns the current authenticated user's profile."""
    current_user = _get_current_user(credentials, session)
    return UserRead(id=current_user.id, email=current_user.email, role=current_user.role)


# ── Reusable Auth Dependency ───────────────────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    """
    FastAPI dependency — inject into any route to require authentication.
    Raises 401 if token is missing, invalid, or expired.
    """
    return _get_current_user(credentials, session)


def _get_current_user(
    credentials: HTTPAuthorizationCredentials,
    session: Session,
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload.get("sub", 0))
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
