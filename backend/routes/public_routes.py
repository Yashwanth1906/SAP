from fastapi import APIRouter, HTTPException
from typing import List
from db.connection import db_manager

router = APIRouter(prefix="/api", tags=["Public API"])

@router.get("/companies", response_model=List[dict])
def get_all_companies():
    
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ID, NAME, CITY, COUNTRY, EMAIL, CREATED_AT
                FROM ORGANIZATIONS
                ORDER BY NAME
            """)
            
            companies = []
            for row in cursor.fetchall():
                companies.append({
                    "id": str(row[0]),
                    "name": row[1],
                    "city": row[2] or "",
                    "country": row[3] or "",
                    "email": row[4],
                    "created_at": row[5].isoformat() if row[5] else None
                })
            
            return companies
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch companies: {str(e)}")

@router.get("/companies/{company_id}", response_model=dict)
def get_company(company_id: str):
    
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ID, NAME, CITY, COUNTRY, EMAIL, CREATED_AT
                FROM ORGANIZATIONS
                WHERE ID = ?
            """, (company_id,))
            
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Company not found")
            
            return {
                "id": str(row[0]),
                "name": row[1],
                "city": row[2] or "",
                "country": row[3] or "",
                "email": row[4],
                "created_at": row[5].isoformat() if row[5] else None
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch company: {str(e)}")

@router.get("/companies/{company_id}/models", response_model=List[dict])
def get_company_models(company_id: str):
    
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ID FROM ORGANIZATIONS WHERE ID = ?
            """, (company_id,))
            
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Company not found")
            
            cursor.execute("""
                SELECT 
                    m.ID,
                    m.NAME,
                    m.TYPE,
                    m.DESCRIPTION,
                    m.CREATED_AT,
                    v.ID as VERSION_ID,
                    v.NAME as VERSION_NAME,
                    v.CREATED_AT as VERSION_CREATED_AT,
                    r.FAIRNESS_SCORE as REPORT_FAIRNESS_SCORE,
                    r.BIAS_FEATURE,
                    r.INTENTIONAL_BIAS,
                    ct.NAME as CERTIFICATION_TYPE_NAME,
                    ct.DESCRIPTION as CERTIFICATION_DESCRIPTION
                FROM MODELS m
                INNER JOIN VERSIONS v ON m.ID = v.MODEL_ID
                LEFT JOIN REPORTS r ON v.REPORT_ID = r.ID
                LEFT JOIN CERTIFICATION_TYPES ct ON v.CERTIFICATION_TYPE_ID = ct.ID
                WHERE m.ORGANIZATION_ID = ? AND v.IS_PUBLIC = TRUE
                ORDER BY m.CREATED_AT DESC, v.CREATED_AT DESC
            """, (company_id,))
            
            models = {}
            for row in cursor.fetchall():
                
                model_id = row[0]
                
                if model_id not in models:
                    models[model_id] = {
                        "id": str(model_id),
                        "name": row[1],
                        "type": row[2],
                        "description": row[3],
                        "created_at": row[4].isoformat() if row[4] else None,
                        "certificationStatus": "Pending",
                        "certificationDate": None,
                        "fairnessScore": None,
                        "certificateUrl": None,    
                        "version": None,
                        "report": None,
                        "certificationType": None
                    }
                
                
                if row[5] is not None:
                    models[model_id]["certificationStatus"] = "Certified"
                    models[model_id]["certificationDate"] = row[7].isoformat() if row[7] else None
                    models[model_id]["version"] = {
                        "id": str(row[5]),
                        "name": row[6],
                        "created_at": row[7].isoformat() if row[7] else None
                    }
                    
                    
                    if row[8] is not None and row[8] != 'None':
                        try:
                            models[model_id]["fairnessScore"] = float(row[8])
                        except (ValueError, TypeError):
                            models[model_id]["fairnessScore"] = None
                    
                    
                    if row[8] is not None or row[10] is not None or row[11] is not None:
                        fairness_score = None
                        if row[8] is not None and row[8] != 'None':
                            try:
                                fairness_score = float(row[8])
                            except (ValueError, TypeError):
                                fairness_score = None
                        
                        models[model_id]["report"] = {
                            "fairnessScore": fairness_score,
                            "biasFeature": row[10] if row[10] is not None and row[10] != 'None' else None,
                            "intentionalBias": row[11] if row[11] is not None and row[11] != 'None' else None
                        }

                                    
                    if row[12] is not None:
                        
                        cert_description = None
                        if len(row) > 13 and row[13] is not None and row[13] != 'None':
                            cert_description = row[13]
                        
                        models[model_id]["certificationType"] = {
                            "name": row[12],
                            "description": cert_description
                        }
            
            return list(models.values())
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch company models: {str(e)}") 