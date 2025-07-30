from fastapi import APIRouter, Query
from typing import List
from controllers.model_controller import ModelController
from utils.models import Model, ModelCreate

router = APIRouter(prefix="/models", tags=["Models"])

@router.post("/", response_model=Model)
def create_model(model: ModelCreate, organization_id: int = Query(...)):
    """Create a new model for an organization"""
    return ModelController.create_model(model, organization_id)

@router.get("/organization/{org_id}", response_model=List[Model])
def get_organization_models(org_id: int):
    """Get all models for a specific organization"""
    return ModelController.get_organization_models(org_id) 