"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
from pathlib import Path
import json

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load activities from JSON file
activities_file = os.path.join(current_dir, "activities.json")
with open(activities_file, "r") as f:
    activities = json.load(f)

# Load teacher credentials from JSON file
teachers_file = os.path.join(current_dir, "teachers.json")
with open(teachers_file, "r") as f:
    teachers = json.load(f)["teachers"]

# Helper function to validate teacher login
def validate_teacher(username: str, password: str):
    for teacher in teachers:
        if teacher["username"] == username and teacher["password"] == password:
            return True
    return False

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/login")
def login(data: LoginRequest):
    if validate_teacher(data.username, data.password):
        return {"message": "Login successful", "status": "success"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

class RegisterRequest(BaseModel):
    username: str
    password: str
    activity_name: str
    email: str

@app.post("/register")
def register_student(data: RegisterRequest):
    if not validate_teacher(data.username, data.password):
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Validate activity exists
    if data.activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[data.activity_name]

    # Validate student is not already signed up
    if data.email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(data.email)
    return {"message": f"Student {data.email} registered successfully for {data.activity_name}", "status": "success"}

class UnregisterRequest(BaseModel):
    username: str
    password: str
    activity_name: str
    email: str

@app.post("/unregister")
def unregister_student(data: UnregisterRequest):
    if not validate_teacher(data.username, data.password):
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Validate activity exists
    if data.activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[data.activity_name]

    # Validate student is signed up
    if data.email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(data.email)
    return {"message": f"Student {data.email} unregistered successfully from {data.activity_name}", "status": "success"}

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """Sign up a student for an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str):
    """Unregister a student from an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
