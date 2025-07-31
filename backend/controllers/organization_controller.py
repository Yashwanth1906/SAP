from fastapi import HTTPException
from db.connection import db_manager
from utils.models import OrganizationCreate, OrganizationLogin, OrganizationResponse
import hashlib
import secrets

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${hashed}"

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hashed password"""
    try:
        salt, hash_value = hashed_password.split('$')
        return hashlib.sha256((password + salt).encode()).hexdigest() == hash_value
    except:
        return False

def create_organization(org_data: OrganizationCreate) -> OrganizationResponse:
    """Create a new organization with hashed password"""
    try:
        with db_manager.get_cursor() as cursor:
            # Check if email already exists
            cursor.execute("SELECT ID FROM ORGANIZATIONS WHERE EMAIL = ?", (org_data.email,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")
            
            # Hash the password
            hashed_password = hash_password(org_data.password)
            
            # Insert new organization
            cursor.execute("""
                INSERT INTO ORGANIZATIONS (NAME, CITY_COUNTRY, EMAIL, PASSWORD)
                VALUES (?, ?, ?, ?)
            """, (org_data.name, org_data.city_country, org_data.email, hashed_password))
            
            # Get the created organization
            cursor.execute("""
                SELECT ID, NAME, EMAIL FROM ORGANIZATIONS WHERE EMAIL = ?
            """, (org_data.email,))
            
            org = cursor.fetchone()
            return OrganizationResponse(
                id=org[0],
                name=org[1],
                email=org[2]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create organization: {str(e)}")

def login_organization(login_data: OrganizationLogin) -> OrganizationResponse:
    """Login organization and return details"""
    try:
        with db_manager.get_cursor() as cursor:
            # Get organization by email
            cursor.execute("""
                SELECT ID, NAME, EMAIL, PASSWORD FROM ORGANIZATIONS WHERE EMAIL = ?
            """, (login_data.email,))
            
            org = cursor.fetchone()
            if not org:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Verify password
            if not verify_password(login_data.password, org[3]):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            return OrganizationResponse(
                id=org[0],
                name=org[1],
                email=org[2]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to login: {str(e)}") 