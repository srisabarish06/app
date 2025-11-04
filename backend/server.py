from fastapi import FastAPI, APIRouter, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== Models ====================

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    date: str
    location: str
    description: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EventCreate(BaseModel):
    name: str
    date: str
    location: str
    description: str

class EventUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

class Registration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    name: str
    email: EmailStr
    registered_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RegistrationCreate(BaseModel):
    event_id: str
    name: str
    email: EmailStr

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    message: str
    username: str

# ==================== Events Routes ====================

@api_router.get("/events", response_model=List[Event])
async def get_events(search: Optional[str] = None):
    """Get all events with optional search"""
    query = {}
    if search:
        query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"location": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        }
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    """Get single event by ID"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.post("/events", response_model=Event, status_code=status.HTTP_201_CREATED)
async def create_event(event_input: EventCreate):
    """Create new event (admin only)"""
    event = Event(**event_input.model_dump())
    doc = event.model_dump()
    await db.events.insert_one(doc)
    return event

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event_update: EventUpdate):
    """Update existing event (admin only)"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = {k: v for k, v in event_update.model_dump().items() if v is not None}
    if update_data:
        await db.events.update_one({"id": event_id}, {"$set": update_data})
    
    updated_event = await db.events.find_one({"id": event_id}, {"_id": 0})
    return updated_event

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    """Delete event (admin only)"""
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Also delete all registrations for this event
    await db.registrations.delete_many({"event_id": event_id})
    return {"message": "Event deleted successfully"}

# ==================== Registration Routes ====================

@api_router.post("/register", response_model=Registration, status_code=status.HTTP_201_CREATED)
async def register_for_event(registration_input: RegistrationCreate):
    """Register user for an event"""
    # Check if event exists
    event = await db.events.find_one({"id": registration_input.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if already registered
    existing = await db.registrations.find_one({
        "event_id": registration_input.event_id,
        "email": registration_input.email
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already registered for this event")
    
    registration = Registration(**registration_input.model_dump())
    doc = registration.model_dump()
    await db.registrations.insert_one(doc)
    return registration

@api_router.get("/registrations/{event_id}")
async def get_event_registrations(event_id: str):
    """Get all registrations for an event (admin only)"""
    registrations = await db.registrations.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    count = len(registrations)
    return {"count": count, "registrations": registrations}

# ==================== Admin Routes ====================

@api_router.post("/admin/login", response_model=AdminResponse)
async def admin_login(credentials: AdminLogin):
    """Simple admin login"""
    # Simple hardcoded check - in production use proper auth
    if credentials.username == "admin" and credentials.password == "admin123":
        return AdminResponse(message="Login successful", username=credentials.username)
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/")
async def root():
    return {"message": "EventHive API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()