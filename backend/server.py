from fastapi import FastAPI
from routes import user_router, organization_router, model_router, schema_router
from db.connection import db_manager

app = FastAPI(title="SAP HANA AI Model Management", version="1.0.0")

# Include routers
app.include_router(user_router)
app.include_router(organization_router)
app.include_router(model_router)
app.include_router(schema_router)

@app.get("/")
def root():
    return {"message": "SAP HANA AI Model Management API"}

# Cleanup on shutdown
@app.on_event("shutdown")
def shutdown_event():
    db_manager.close_connection()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)