from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import routes


app = FastAPI()

# Allow CORS for the frontend (Vite default port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)

@app.get("/")
def read_root():
    return {"message": "Equalizer backend running!"}
