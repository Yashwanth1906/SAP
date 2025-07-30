from fastapi import HTTPException
from db.connection import db_manager
from utils.models import Organization, OrganizationCreate

class OrganizationController:
    @staticmethod
    def create_organization(org: OrganizationCreate) -> Organization:
        try:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    INSERT INTO ORGANIZATIONS (NAME, ADDRESS)
                    VALUES (?, ?)
                """, (org.name, org.address))
                        
                cursor.execute("""
                    SELECT ID, NAME, ADDRESS, ADMIN_ID
                    FROM ORGANIZATIONS
                    WHERE ID = (SELECT MAX(ID) FROM ORGANIZATIONS)
                """)
                
                org_data = cursor.fetchone()
                return Organization(
                    id=org_data[0],
                    name=org_data[1],
                    address=org_data[2],
                    admin_id=org_data[3] if org_data[3] else None
                )
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create organization: {str(e)}") 