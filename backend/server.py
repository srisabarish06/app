from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

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
    user_id: Optional[str] = None  # Links to user if logged in
    registered_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RegistrationCreate(BaseModel):
    event_id: str
    name: str
    email: EmailStr

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password_hash: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserSignup(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    token: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    message: str
    username: str

# ==================== Helper Functions ====================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    """Create JWT token"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    """Decode and verify JWT token"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Get current user from JWT token (optional)"""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        return payload
    except HTTPException:
        return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Require authentication (mandatory)"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    return decode_token(credentials.credentials)

# ==================== User Auth Routes ====================

@api_router.post("/auth/signup", response_model=UserResponse)
async def signup(user_data: UserSignup):
    """User signup"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password)
    )
    
    doc = user.model_dump()
    await db.users.insert_one(doc)
    
    # Create token
    token = create_token(user.id, user.email)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        token=token
    )

@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    """User login"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['email'])
    
    return UserResponse(
        id=user['id'],
        email=user['email'],
        name=user['name'],
        token=token
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(require_auth)):
    """Get current user profile"""
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/auth/profile")
async def update_profile(profile_data: UserProfileUpdate, current_user: dict = Depends(require_auth)):
    """Update user profile"""
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Check if email is being changed and is already taken
    if 'email' in update_data:
        existing = await db.users.find_one({"email": update_data['email'], "id": {"$ne": current_user['user_id']}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    await db.users.update_one({"id": current_user['user_id']}, {"$set": update_data})
    
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password_hash": 0})
    return user

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
async def register_for_event(registration_input: RegistrationCreate, current_user: Optional[dict] = Depends(get_current_user)):
    """Register user for an event (works for both guest and logged-in users)"""
    # Check if event exists
    event = await db.events.find_one({"id": registration_input.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if already registered
    query = {
        "event_id": registration_input.event_id,
        "email": registration_input.email
    }
    existing = await db.registrations.find_one(query)
    if existing:
        raise HTTPException(status_code=400, detail="Already registered for this event")
    
    # Create registration
    registration_data = registration_input.model_dump()
    if current_user:
        registration_data['user_id'] = current_user['user_id']
    
    registration = Registration(**registration_data)
    doc = registration.model_dump()
    await db.registrations.insert_one(doc)
    return registration

@api_router.get("/registrations/{event_id}")
async def get_event_registrations(event_id: str):
    """Get all registrations for an event (admin only)"""
    registrations = await db.registrations.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    count = len(registrations)
    return {"count": count, "registrations": registrations}

@api_router.get("/user/registrations")
async def get_user_registrations(current_user: dict = Depends(require_auth)):
    """Get all registrations for current user"""
    registrations = await db.registrations.find({"user_id": current_user['user_id']}, {"_id": 0}).to_list(1000)
    
    # Fetch event details for each registration
    enriched_registrations = []
    for reg in registrations:
        event = await db.events.find_one({"id": reg['event_id']}, {"_id": 0})
        if event:
            enriched_registrations.append({
                **reg,
                "event": event
            })
    
    return enriched_registrations

@api_router.delete("/registrations/{registration_id}")
async def cancel_registration(registration_id: str, current_user: dict = Depends(require_auth)):
    """Cancel a registration"""
    registration = await db.registrations.find_one({"id": registration_id})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    # Check if user owns this registration
    if registration.get('user_id') != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this registration")
    
    await db.registrations.delete_one({"id": registration_id})
    return {"message": "Registration cancelled successfully"}

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