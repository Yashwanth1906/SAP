from fastapi import APIRouter, Query
from typing import Optional
from controllers.user_controller import UserController
from utils.models import User, UserCreate, UserResponse

router = APIRouter(prefix="/user", tags=["Users"])

@router.get("/{email}", response_model=UserResponse)
def get_user_info(email: str):
    """Get user information and organization details"""
    return UserController.get_user_info(email)

@router.post("/", response_model=User)
def create_user(user: UserCreate, organization_id: Optional[int] = Query(None)):
    """Create a new user"""
    return UserController.create_user(user, organization_id) 