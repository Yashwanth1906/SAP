from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import organization_router, model_router, schema_router, public_router, chat_router
from db.connection import db_manager

app = FastAPI(title="SAP HANA AI Model Management", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(organization_router)
app.include_router(model_router)
app.include_router(schema_router)
app.include_router(public_router)
app.include_router(chat_router)

@app.get("/")
def root():
    return {"message": "SAP HANA AI Model Management API"}

@app.on_event("shutdown")
def shutdown_event():
    db_manager.close_connection()