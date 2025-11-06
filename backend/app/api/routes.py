#route definitions: upload, process, spectrum, settings, ai/compare

from fastapi import APIRouter

router = APIRouter(prefix="/api")

@router.get("/ping")
def ping():
    return {"status": "ok", "message": "Backend API reachable!"}
