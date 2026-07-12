from fastapi import FastAPI

app = FastAPI(
    title="TransitOps API",
    version="1.0.0",
    description="Smart Transport Operations Platform"
)

@app.get("/")
def root():
    return {
        "message": "TransitOps Backend Running"
    }