from fastapi import HTTPException
from typing import Optional
from db.connection import db_manager
from utils.models import User, UserCreate, UserResponse

class UserController:
    @staticmethod
    def get_user_info(email: str) -> UserResponse:
        try:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    SELECT U.ID, U.EMAIL, U.ORGANIZATION_ID, O.NAME as ORG_NAME
                    FROM USERS U
                    LEFT JOIN ORGANIZATIONS O ON U.ORGANIZATION_ID = O.ID
                    WHERE U.EMAIL = ?
                """, (email,))
                
                user_data = cursor.fetchone()
                
                if not user_data:
                    return UserResponse(
                        message="User not found. Please register as an organization first.",
                        organization_name=None,
                        is_new_user=True
                    )
                
                user_id, user_email, org_id, org_name = user_data
                
                if org_id is None:
                    return UserResponse(
                        message="User found but not associated with any organization. Please contact your administrator.",
                        organization_name=None,
                        is_new_user=False
                    )
                
                return UserResponse(
                    message="User found and associated with organization.",
                    organization_name=org_name,
                    is_new_user=False
                )
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    @staticmethod
    def create_user(user: UserCreate, organization_id: Optional[int] = None) -> User:
        try:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    INSERT INTO USERS (EMAIL, PASSWORD, ORGANIZATION_ID)
                    VALUES (?, ?, ?)
                """, (user.email, user.password, organization_id))
                    
                cursor.execute("""
                    SELECT ID, EMAIL, PASSWORD, ORGANIZATION_ID
                    FROM USERS
                    WHERE ID = (SELECT MAX(ID) FROM USERS)
                """)
                
                user_data = cursor.fetchone()
                return User(
                    id=user_data[0],
                    email=user_data[1],
                    password=user_data[2],
                    organization_id=user_data[3]
                )
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}") 