from fastapi import APIRouter
from controllers.organization_controller import create_organization, login_organization
from utils.models import OrganizationCreate, OrganizationLogin, OrganizationResponse
from typing import List
from db.connection import db_manager
from fastapi import HTTPException

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.post("/register", response_model=OrganizationResponse)
def register_organization(org_data: OrganizationCreate):
    
    return create_organization(org_data)

@router.post("/login", response_model=OrganizationResponse)
def login_organization_endpoint(login_data: OrganizationLogin):
    
    return login_organization(login_data)

@router.get("/", response_model=List[dict])
def get_all_organizations():
    
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ID, NAME, CITY, COUNTRY, EMAIL, CREATED_AT
                FROM ORGANIZATIONS
                ORDER BY NAME
            """)
            
            organizations = []
            for row in cursor.fetchall():
                
                city = row[2] or ""
                country = row[3] or ""
                
                organizations.append({
                    "id": str(row[0]),
                    "name": row[1],
                    "city": city,
                    "country": country,
                    "email": row[3],
                    "created_at": row[4].isoformat() if row[4] else None
                })
            
            return organizations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch organizations: {str(e)}")

@router.get("/{organization_id}", response_model=dict)
def get_organization(organization_id: int):
    
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ID, NAME, CITY, COUNTRY, EMAIL, CREATED_AT
                FROM ORGANIZATIONS
                WHERE ID = ?
            """, (organization_id,))
            
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Organization not found")
            
                                                            
            city = row[2] or ""
            country = row[3] or ""
            
            return {
                "id": str(row[0]),
                "name": row[1],
                "city": city,
                "country": country,
                "email": row[3],
                "created_at": row[4].isoformat() if row[4] else None
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch organization: {str(e)}")