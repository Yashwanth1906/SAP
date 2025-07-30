from fastapi import APIRouter
from db.schema import initialize_schema

router = APIRouter(tags=["Schema"])

@router.post("/initialize-schema")
def init_schema():
    return initialize_schema() 