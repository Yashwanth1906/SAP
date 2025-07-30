from fastapi import HTTPException
from typing import List
from db.connection import db_manager
from utils.models import Model, ModelCreate

class ModelController:
    @staticmethod
    def create_model(model: ModelCreate, organization_id: int) -> Model:
        try:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    INSERT INTO MODELS (NAME, TYPE, CERTIFICATION_CATEGORY, BIAS_ON, INTENTIONAL_BIAS, ORGANIZATION_ID)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (model.name, model.type, model.certification_category, model.bias_on, model.intentional_bias, organization_id))
                
                cursor.execute("""
                    SELECT ID, NAME, TYPE, CERTIFICATION_CATEGORY, BIAS_ON, INTENTIONAL_BIAS, ORGANIZATION_ID
                    FROM MODELS
                    WHERE ID = (SELECT MAX(ID) FROM MODELS)
                """)
                
                model_data = cursor.fetchone()
                return Model(
                    id=model_data[0],
                    name=model_data[1],
                    type=model_data[2],
                    certification_category=model_data[3],
                    bias_on=model_data[4],
                    intentional_bias=model_data[5],
                    organization_id=model_data[6]
                )
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create model: {str(e)}")
    
    @staticmethod
    def get_organization_models(org_id: int) -> List[Model]:    
        try:
            with db_manager.get_cursor() as cursor:
                cursor.execute("""
                    SELECT ID, NAME, TYPE, CERTIFICATION_CATEGORY, BIAS_ON, INTENTIONAL_BIAS, ORGANIZATION_ID
                    FROM MODELS
                    WHERE ORGANIZATION_ID = ?
                """, (org_id,))
                
                models = []
                for row in cursor.fetchall():
                    models.append(Model(
                        id=row[0],
                        name=row[1],
                        type=row[2],
                        certification_category=row[3],
                        bias_on=row[4],
                        intentional_bias=row[5],
                        organization_id=row[6]
                    ))
                
                return models
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}") 