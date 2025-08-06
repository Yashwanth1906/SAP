from fastapi import HTTPException
from db.connection import db_manager
from utils.models import OrganizationCreate, OrganizationLogin, OrganizationResponse
import hashlib
import secrets

def hash_password(password: str) -> str:
   
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${hashed}"

def verify_password(password: str, hashed_password: str) -> bool:
   
    try:
        salt, hash_value = hashed_password.split('$')
        return hashlib.sha256((password + salt).encode()).hexdigest() == hash_value
    except:
        return False

def create_organization(org_data: OrganizationCreate) -> OrganizationResponse:
   
    try:
        with db_manager.get_cursor() as cursor:
           
            cursor.execute("SELECT ID FROM ORGANIZATIONS WHERE EMAIL = ?", (org_data.email,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")
            
           
            hashed_password = hash_password(org_data.password)
            
           
            cursor.execute("""
                INSERT INTO ORGANIZATIONS (NAME, CITY, COUNTRY, EMAIL, PASSWORD, TYPE, CONTACT_NUMBER, WEBSITE, ORGANIZATION_REGISTRATION_NUMBER)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                org_data.name, 
                org_data.city, 
                org_data.country, 
                org_data.email, 
                hashed_password,
                org_data.organization_type,
                org_data.contact_number,
                org_data.website,
                org_data.registration_number
            ))
            
           
            cursor.execute("""
                SELECT ID, NAME, EMAIL, ISPREMIUM FROM ORGANIZATIONS WHERE EMAIL = ?
            """, (org_data.email,))
            
            org = cursor.fetchone()
            return OrganizationResponse(
                id=org[0],
                name=org[1],
                email=org[2],
                is_premium=bool(org[3])
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create organization: {str(e)}")

def login_organization(login_data: OrganizationLogin) -> OrganizationResponse:
   
    try:
        with db_manager.get_cursor() as cursor:
           
            cursor.execute("""
                SELECT ID, NAME, EMAIL, PASSWORD, ISPREMIUM FROM ORGANIZATIONS WHERE EMAIL = ?
            """, (login_data.email,))
            
            org = cursor.fetchone()
            if not org:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
                                                                
            if not verify_password(login_data.password, org[3]):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            return OrganizationResponse(
                id=org[0],
                name=org[1],
                email=org[2],
                is_premium=bool(org[4])
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to login: {str(e)}") 