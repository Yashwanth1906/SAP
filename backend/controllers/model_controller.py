from fastapi import HTTPException
from db.connection import db_manager
from utils.models import ModelCreate, Model, ModelWithVersions, VersionWithDetails, Report, CertificationType, CertificationTypeBase, ReportBase, VersionBase
from typing import List

def create_model(model_data: ModelCreate) -> Model:
    """Create a new model"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("SELECT ID FROM ORGANIZATIONS WHERE ID = ?", (model_data.organization_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Organization not found")
            
            cursor.execute("""
                INSERT INTO MODELS (ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (model_data.organization_id, model_data.name, model_data.type, 
                  model_data.description, model_data.github_url, model_data.github_actions))
            
            cursor.execute("""
                SELECT ID, ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS, CREATED_AT
                FROM MODELS WHERE ID = (SELECT MAX(ID) FROM MODELS WHERE ORGANIZATION_ID = ?)
            """, (model_data.organization_id,))
            
            model = cursor.fetchone()
            return Model(
                id=model[0],
                organization_id=model[1],
                name=model[2],
                type=model[3],
                description=model[4],
                github_url=model[5],
                github_actions=model[6],
                created_at=model[7]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create model: {str(e)}")

def get_models_by_organization(organization_id: int) -> List[Model]:
    """Get all models for an organization"""
    try:
        with db_manager.get_cursor() as cursor:
            # Verify organization exists
            cursor.execute("SELECT ID FROM ORGANIZATIONS WHERE ID = ?", (organization_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Organization not found")
            
            # Get all models for the organization
            cursor.execute("""
                SELECT ID, ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS, CREATED_AT
                FROM MODELS WHERE ORGANIZATION_ID = ?
                ORDER BY CREATED_AT DESC
            """, (organization_id,))
            
            models = []
            for row in cursor.fetchall():
                models.append(Model(
                    id=row[0],
                    organization_id=row[1],
                    name=row[2],
                    type=row[3],
                    description=row[4],
                    github_url=row[5],
                    github_actions=row[6],
                    created_at=row[7]
                ))
            
            return models
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")

def get_model_versions_with_details(model_id: int) -> ModelWithVersions:
    """Get detailed versions of a model with reports"""
    print("GETTING MODEL VERSIONS WITH DETAILS")
    try: 
        with db_manager.get_cursor() as cursor:
            # Get the model
            cursor.execute("""
                SELECT ID, ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS, CREATED_AT
                FROM MODELS WHERE ID = ?
            """, (model_id,))
            
            model_row = cursor.fetchone()
            if not model_row:
                raise HTTPException(status_code=404, detail="Model not found")
            
            model = Model(
                id=model_row[0],
                organization_id=model_row[1],
                name=model_row[2],
                type=model_row[3],
                description=model_row[4],
                github_url=model_row[5],
                github_actions=model_row[6],
                created_at=model_row[7]
            )
            
            # Get versions with their reports and certification types
            cursor.execute("""
                SELECT v.ID, v.NAME, v.SELECTION_DATA, v.IS_PUBLIC, v.CERTIFICATION_TYPE_ID, 
                       v.REPORT_ID, v.MODEL_ID, v.CREATED_AT,
                       r.ID, r.MITIGATION_TECHNIQUES, r.BIAS_FEATURE, r.FAIRNESS_SCORE, 
                       r.INTENTIONAL_BIAS, r.SHAP, r.CREATED_AT,
                       ct.ID, ct.NAME, ct.DESCRIPTION
                FROM VERSIONS v
                LEFT JOIN REPORTS r ON v.REPORT_ID = r.ID
                LEFT JOIN CERTIFICATION_TYPES ct ON v.CERTIFICATION_TYPE_ID = ct.ID
                WHERE v.MODEL_ID = ?
                ORDER BY v.CREATED_AT DESC
            """, (model_id,))
            
            versions = []
            for row in cursor.fetchall():
                # Create report object if exists
                report = None
                if row[8]:  # Report ID exists
                    report = Report(
                        id=row[8],
                        model_id=model_id,
                        mitigation_techniques=row[9],
                        bias_feature=row[10],
                        fairness_score=row[11],
                        intentional_bias=row[12],
                        shap=row[13],
                        created_at=row[14]
                    )
                
                # Create certification type object if exists
                certification_type = None
                if row[15]:  # Certification type ID exists
                    certification_type = CertificationType(
                        id=row[15],
                        name=row[16],
                        description=row[17]
                    )
                
                # Create version with details
                version = VersionWithDetails(
                    id=row[0],
                    name=row[1],
                    selection_data=row[2],
                    is_public=row[3],
                    certification_type_id=row[4],
                    report_id=row[5],
                    model_id=row[6],
                    created_at=row[7],
                    report=report,
                    certification_type=certification_type
                )
                versions.append(version)
            
            return ModelWithVersions(**model.dict(), versions=versions)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model versions: {str(e)}")

def certify_model(model_id: int) -> dict:
    """Certify a model for bias analysis"""
    try:
        with db_manager.get_cursor() as cursor:
            # Verify model exists
            cursor.execute("SELECT ID FROM MODELS WHERE ID = ?", (model_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Model not found")
            
            # For now, just return a success message
            # In a real implementation, this would trigger the bias analysis process
            return {
                "message": "Model certification process started successfully",
                "model_id": model_id,
                "status": "certification_initiated"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to certify model: {str(e)}")

def publish_version(version_id: int) -> dict:
    """Publish a version"""
    try:
        with db_manager.get_cursor() as cursor:
            # Verify version exists
            cursor.execute("SELECT ID FROM VERSIONS WHERE ID = ?", (version_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Version not found")
            
            # For now, just return a success message
            # In a real implementation, this would mark the version as published
            return {
                "message": "Version published successfully",
                "version_id": version_id,
                "status": "published"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to publish version: {str(e)}")

def create_certification_type(certification_data: CertificationTypeBase) -> dict:
    """Create a new certification type"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO CERTIFICATION_TYPES (NAME, DESCRIPTION)
                VALUES (?, ?)
            """, (certification_data.name, certification_data.description))
            
            # Get the created certification type
            cursor.execute("""
                SELECT ID, NAME, DESCRIPTION
                FROM CERTIFICATION_TYPES WHERE ID = (SELECT MAX(ID) FROM CERTIFICATION_TYPES)
            """)
            
            cert = cursor.fetchone()
            return {
                "message": "Certification type created successfully",
                "certification": {
                    "id": cert[0],
                    "name": cert[1],
                    "description": cert[2]
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create certification type: {str(e)}")

def create_report(report_data: ReportBase, model_id: int) -> dict:
    """Create a new report for a model"""
    try:
        with db_manager.get_cursor() as cursor:
            # Verify model exists
            cursor.execute("SELECT ID FROM MODELS WHERE ID = ?", (model_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Model not found")
            
            cursor.execute("""
                INSERT INTO REPORTS (MODEL_ID, MITIGATION_TECHNIQUES, BIAS_FEATURE, FAIRNESS_SCORE, INTENTIONAL_BIAS, SHAP)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (model_id, report_data.mitigation_techniques, report_data.bias_feature,
                  report_data.fairness_score, report_data.intentional_bias, report_data.shap))
            
            # Get the created report
            cursor.execute("""
                SELECT ID, MODEL_ID, MITIGATION_TECHNIQUES, BIAS_FEATURE, FAIRNESS_SCORE, INTENTIONAL_BIAS, SHAP, CREATED_AT
                FROM REPORTS WHERE ID = (SELECT MAX(ID) FROM REPORTS WHERE MODEL_ID = ?)
            """, (model_id,))
            
            report = cursor.fetchone()
            return {
                "message": "Report created successfully",
                "report": {
                    "id": report[0],
                    "model_id": report[1],
                    "mitigation_techniques": report[2],
                    "bias_feature": report[3],
                    "fairness_score": report[4],
                    "intentional_bias": report[5],
                    "shap": report[6],
                    "created_at": report[7]
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create report: {str(e)}")

def create_version(version_data: VersionBase, model_id: int) -> dict:
    """Create a new version for a model"""
    try:
        with db_manager.get_cursor() as cursor:
            # Verify model exists
            cursor.execute("SELECT ID FROM MODELS WHERE ID = ?", (model_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Model not found")
            
            # Verify certification type exists if provided
            if version_data.certification_type_id:
                cursor.execute("SELECT ID FROM CERTIFICATION_TYPES WHERE ID = ?", (version_data.certification_type_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Certification type not found")
            
            # Verify report exists if provided
            if version_data.report_id:
                cursor.execute("SELECT ID FROM REPORTS WHERE ID = ?", (version_data.report_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Report not found")
            
            cursor.execute("""
                INSERT INTO VERSIONS (NAME, SELECTION_DATA, IS_PUBLIC, CERTIFICATION_TYPE_ID, REPORT_ID, MODEL_ID)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (version_data.name, version_data.selection_data, version_data.is_public,
                  version_data.certification_type_id, version_data.report_id, model_id))
            
            # Get the created version
            cursor.execute("""
                SELECT ID, NAME, SELECTION_DATA, IS_PUBLIC, CERTIFICATION_TYPE_ID, REPORT_ID, MODEL_ID, CREATED_AT
                FROM VERSIONS WHERE ID = (SELECT MAX(ID) FROM VERSIONS WHERE MODEL_ID = ?)
            """, (model_id,))
            
            version = cursor.fetchone()
            return {
                "message": "Version created successfully",
                "version": {
                    "id": version[0],
                    "name": version[1],
                    "selection_data": version[2],
                    "is_public": version[3],
                    "certification_type_id": version[4],
                    "report_id": version[5],
                    "model_id": version[6],
                    "created_at": version[7]
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create version: {str(e)}") 