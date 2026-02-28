from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import json
from ..database import get_db
from ..models import User, FormDefinition
from ..schemas import (
    FormDefinitionCreate, FormDefinitionUpdate,
    FormDefinitionResponse, FormDefinitionListItem,
)
from ..dependencies import get_current_user, get_state_official

router = APIRouter(prefix="/forms", tags=["Forms"])


def _parse_definition(form: FormDefinition) -> dict:
    """Parse the JSON definition string into a dict."""
    try:
        return json.loads(form.definition)
    except (json.JSONDecodeError, TypeError):
        return {"sections": [], "fields": []}


def _form_to_response(form: FormDefinition) -> FormDefinitionResponse:
    return FormDefinitionResponse(
        id=form.id,
        name=form.name,
        description=form.description,
        version=form.version,
        status=form.status,
        definition=_parse_definition(form),
        created_by=form.created_by,
        created_at=form.created_at,
        updated_at=form.updated_at,
        deployed_at=form.deployed_at,
    )


# /active must come before /{form_id} to avoid FastAPI capturing "active" as an int param
@router.get("/active")
def get_active_form(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the currently DEPLOYED form definition. Returns {data: null} if none."""
    form = db.query(FormDefinition).filter(
        FormDefinition.status == "DEPLOYED"
    ).order_by(FormDefinition.deployed_at.desc()).first()

    if not form:
        return {"data": None}

    return {"data": _form_to_response(form)}


@router.get("", response_model=List[FormDefinitionListItem])
def list_forms(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """List all form definitions (State Official only)."""
    query = db.query(FormDefinition)
    if status:
        query = query.filter(FormDefinition.status == status.upper())

    forms = query.order_by(FormDefinition.created_at.desc()).limit(limit).offset(offset).all()

    return [
        FormDefinitionListItem(
            id=f.id,
            name=f.name,
            description=f.description,
            version=f.version,
            status=f.status,
            created_at=f.created_at,
            deployed_at=f.deployed_at,
        )
        for f in forms
    ]


@router.post("", response_model=FormDefinitionResponse, status_code=status.HTTP_201_CREATED)
def create_form(
    form_data: FormDefinitionCreate,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Create a new form definition as DRAFT."""
    form = FormDefinition(
        name=form_data.name,
        description=form_data.description,
        definition=json.dumps(form_data.definition),
        status="DRAFT",
        version=1,
        created_by=current_user.id,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return _form_to_response(form)


@router.get("/{form_id}", response_model=FormDefinitionResponse)
def get_form(
    form_id: int,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Get a single form definition by ID."""
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    return _form_to_response(form)


@router.put("/{form_id}", response_model=FormDefinitionResponse)
def update_form(
    form_id: int,
    form_data: FormDefinitionUpdate,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Update a form definition. Only DRAFT forms are editable."""
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    if form.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only DRAFT forms can be edited. Archive or create a new version.",
        )

    if form_data.name is not None:
        form.name = form_data.name
    if form_data.description is not None:
        form.description = form_data.description
    if form_data.definition is not None:
        form.definition = json.dumps(form_data.definition)
    form.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(form)
    return _form_to_response(form)


@router.post("/{form_id}/deploy", response_model=FormDefinitionResponse)
def deploy_form(
    form_id: int,
    current_user: User = Depends(get_state_official),
    db: Session = Depends(get_db),
):
    """Deploy a form: archive the current DEPLOYED form, then set this one to DEPLOYED."""
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    if form.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only DRAFT forms can be deployed.",
        )

    # Archive any currently DEPLOYED form
    currently_deployed = db.query(FormDefinition).filter(
        FormDefinition.status == "DEPLOYED"
    ).all()
    for old_form in currently_deployed:
        old_form.status = "ARCHIVED"
        old_form.updated_at = datetime.utcnow()

    # Deploy the target form
    form.status = "DEPLOYED"
    form.version = form.version + 1 if form.version else 2
    form.deployed_at = datetime.utcnow()
    form.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(form)
    return _form_to_response(form)
