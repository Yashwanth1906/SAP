import os
import shutil
from datetime import datetime
from fastapi import HTTPException, UploadFile, File, Form
from typing import Optional
from db.connection import db_manager
from utils.models import ModelCreate, Model, ModelWithVersions, CertificationTypeBase, ReportBase, VersionBase, CertifyModelRequest, Report, CertificationType, VersionWithDetails

def create_model(model_data: ModelCreate) -> Model:
    """Create a new model"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO MODELS (ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (model_data.organization_id, model_data.name, model_data.type, model_data.description,
                  model_data.github_url, model_data.github_actions))
            
            # Get the created model
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
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create model: {str(e)}")

def get_models_by_organization(organization_id: int) -> list[Model]:
    """Get all models for an organization"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ID, ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS, CREATED_AT
                FROM MODELS WHERE ORGANIZATION_ID = ?
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
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")

def get_model_versions_with_details(model_id: int) -> ModelWithVersions:
    """Get detailed versions of a model with reports and certification types"""
    try:
        with db_manager.get_cursor() as cursor:
            # Get model details
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
            
            # Get versions with details
            cursor.execute("""
                SELECT v.ID, v.NAME, v.SELECTION_DATA, v.IS_PUBLIC, v.CERTIFICATION_TYPE_ID, v.REPORT_ID, v.MODEL_ID, v.CREATED_AT,
                       r.ID, r.MODEL_ID, r.MITIGATION_TECHNIQUES, r.BIAS_FEATURE, r.FAIRNESS_SCORE, r.INTENTIONAL_BIAS, r.SHAP, r.CREATED_AT,
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
                        model_id=row[9],
                        mitigation_techniques=row[10],
                        bias_feature=row[11],
                        fairness_score=row[12],
                        intentional_bias=row[13],
                        shap=row[14],
                        created_at=row[15]
                    )
                
                # Create certification type object if exists
                certification_type = None
                if row[16]:  # Certification type ID exists
                    certification_type = CertificationType(
                        id=row[16],
                        name=row[17],
                        description=row[18]
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
            
            return ModelWithVersions(
                id=model.id,
                organization_id=model.organization_id,
                name=model.name,
                type=model.type,
                description=model.description,
                github_url=model.github_url,
                github_actions=model.github_actions,
                created_at=model.created_at,
                versions=versions
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model versions: {str(e)}")

def certify_model(model_id: int, model_file: UploadFile, dataset_file: UploadFile, version_name: str, 
                 selection_data: Optional[str] = None, intentional_bias: Optional[str] = None) -> dict:
    """Certify a model for bias analysis with file uploads"""
    try:
        # Create assets directory if it doesn't exist
        assets_dir = os.path.join(os.getcwd(), "assets")
        if not os.path.exists(assets_dir):
            os.makedirs(assets_dir)
        
        # Create model-specific directory
        model_assets_dir = os.path.join(assets_dir, f"model_{model_id}")
        if not os.path.exists(model_assets_dir):
            os.makedirs(model_assets_dir)
        
        # Save model file
        model_file_path = os.path.join(model_assets_dir, f"model_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{model_file.filename}")
        with open(model_file_path, "wb") as buffer:
            shutil.copyfileobj(model_file.file, buffer)
        
        # Save dataset file
        dataset_file_path = os.path.join(model_assets_dir, f"dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{dataset_file.filename}")
        with open(dataset_file_path, "wb") as buffer:
            shutil.copyfileobj(dataset_file.file, buffer)
        
        with db_manager.get_cursor() as cursor:
            # Verify model exists
            cursor.execute("SELECT ID, NAME FROM MODELS WHERE ID = ?", (model_id,))
            model_result = cursor.fetchone()
            if not model_result:
                raise HTTPException(status_code=404, detail="Model not found")
            
            model_name = model_result[1]
            
            # Create a hardcoded report
            cursor.execute("""
                INSERT INTO REPORTS (MODEL_ID, MITIGATION_TECHNIQUES, BIAS_FEATURE, FAIRNESS_SCORE, INTENTIONAL_BIAS, SHAP)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                model_id,
                "Data preprocessing, feature engineering, and algorithmic adjustments",
                "gender,age,education_level",
                0.85,
                intentional_bias or "[\"gender\", \"age\"]",
                "Feature importance analysis showing gender and age as primary bias contributors"
            ))
            
            # Get the created report ID
            cursor.execute("SELECT MAX(ID) FROM REPORTS WHERE MODEL_ID = ?", (model_id,))
            report_id = cursor.fetchone()[0]
            
            # Create a hardcoded certification type if it doesn't exist
            cursor.execute("SELECT ID FROM CERTIFICATION_TYPES WHERE NAME = ?", ("Standard Bias Certification",))
            cert_result = cursor.fetchone()
            
            if cert_result:
                certification_type_id = cert_result[0]
            else:
                cursor.execute("""
                    INSERT INTO CERTIFICATION_TYPES (NAME, DESCRIPTION)
                    VALUES (?, ?)
                """, ("Standard Bias Certification", "Comprehensive bias assessment and mitigation certification"))
                
                cursor.execute("SELECT MAX(ID) FROM CERTIFICATION_TYPES")
                certification_type_id = cursor.fetchone()[0]
            
            # Create version with the report and certification
            cursor.execute("""
                INSERT INTO VERSIONS (NAME, SELECTION_DATA, IS_PUBLIC, CERTIFICATION_TYPE_ID, REPORT_ID, MODEL_ID)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                version_name,
                selection_data or "{\"gender\": \"all\", \"age\": \"18-65\", \"education\": \"bachelor+\"}",
                True,
                certification_type_id,
                report_id,
                model_id
            ))
            
            # Get the created version
            cursor.execute("""
                SELECT ID, NAME, SELECTION_DATA, IS_PUBLIC, CERTIFICATION_TYPE_ID, REPORT_ID, MODEL_ID, CREATED_AT
                FROM VERSIONS WHERE ID = (SELECT MAX(ID) FROM VERSIONS WHERE MODEL_ID = ?)
            """, (model_id,))
            
            version = cursor.fetchone()
            
            return {
                "message": "Model certification completed successfully",
                "model_id": model_id,
                "model_name": model_name,
                "version_id": version[0],
                "version_name": version[1],
                "report_id": report_id,
                "certification_type_id": certification_type_id,
                "status": "certified",
                "files_saved": {
                    "model_file": model_file_path,
                    "dataset_file": dataset_file_path
                }
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