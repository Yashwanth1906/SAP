from fastapi import APIRouter
from db.schema import initialize_schema, clear_schema

router = APIRouter(tags=["Schema"])

@router.post("/initialize-schema")
def init_schema():
    return initialize_schema()

@router.post("/clear-schema")
def clear_schema_endpoint():
    return clear_schema()