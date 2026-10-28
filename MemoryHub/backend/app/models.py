import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Boolean, DateTime, Float, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from .db import Base


def uid():
    return str(uuid.uuid4())


def now():
    return datetime.now(timezone.utc)


class Identity(Base):
    __tablename__ = 'identities'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class LoginSession(Base):
    __tablename__ = 'login_sessions'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey('identities.id'))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Agent(Base):
    __tablename__ = 'agents'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey('identities.id'), index=True)
    name: Mapped[str] = mapped_column(String(120))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    token_prefix: Mapped[str] = mapped_column(String(12))
    permissions: Mapped[dict] = mapped_column(JSONB)
    external: Mapped[bool] = mapped_column(Boolean, default=True)
    service_label: Mapped[str] = mapped_column(String(200), default='未指定外部服务')
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Project(Base):
    __tablename__ = 'projects'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey('identities.id'), index=True)
    name: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text, default='')
    status: Mapped[str] = mapped_column(String(30), default='active')
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Persona(Base):
    __tablename__ = 'personas'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey('identities.id'), index=True)
    name: Mapped[str] = mapped_column(String(120))
    config: Mapped[dict] = mapped_column(JSONB)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    external_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Source(Base):
    __tablename__ = 'sources'
    __table_args__ = (UniqueConstraint('owner_id', 'scope_key', 'checksum'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey('identities.id'), index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey('projects.id'), nullable=True, index=True)
    scope_key: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(30), default='knowledge')
    title: Mapped[str] = mapped_column(String(240))
    kind: Mapped[str] = mapped_column(String(30))
    speaker: Mapped[str] = mapped_column(String(30), default='unknown')
    content: Mapped[str] = mapped_column(Text)
    checksum: Mapped[str] = mapped_column(String(64), index=True)
    sensitivity: Mapped[int] = mapped_column(Integer, default=1)
    external_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    retention_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Memory(Base):
    __tablename__ = 'memories'
    __table_args__ = (Index('ix_memory_scope_status', 'owner_id', 'project_id', 'status'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey('identities.id'), index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey('projects.id'), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(240))
    body: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text, default='')
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    applicability: Mapped[str] = mapped_column(String(240), default='')
    source_id: Mapped[str] = mapped_column(ForeignKey('sources.id'), index=True)
    quote: Mapped[str] = mapped_column(Text, default='')
    quote_start: Mapped[int] = mapped_column(Integer, default=0)
    quote_end: Mapped[int] = mapped_column(Integer, default=0)
    evidence_source_ids: Mapped[list] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(30), default='candidate', index=True)
    provenance: Mapped[str] = mapped_column(String(30), default='extracted')
    importance: Mapped[int] = mapped_column(Integer, default=3)
    sensitivity: Mapped[int] = mapped_column(Integer, default=1)
    external_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    locked: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    fact_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(100))
    updated_by: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Revision(Base):
    __tablename__ = 'revisions'
    __table_args__ = (UniqueConstraint('memory_id', 'version'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    memory_id: Mapped[str] = mapped_column(ForeignKey('memories.id', ondelete='CASCADE'), index=True)
    version: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[dict] = mapped_column(JSONB)
    reason: Mapped[str] = mapped_column(String(240))
    actor: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Relation(Base):
    __tablename__ = 'relations'
    __table_args__ = (UniqueConstraint('left_id', 'right_id', 'kind'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    left_id: Mapped[str] = mapped_column(ForeignKey('memories.id', ondelete='CASCADE'), index=True)
    right_id: Mapped[str] = mapped_column(ForeignKey('memories.id', ondelete='CASCADE'), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)


class SearchIndex(Base):
    __tablename__ = 'search_indexes'
    memory_id: Mapped[str] = mapped_column(ForeignKey('memories.id', ondelete='CASCADE'), primary_key=True)
    version: Mapped[int] = mapped_column(Integer)
    terms: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list | None] = mapped_column(Vector(), nullable=True)
    model: Mapped[str | None] = mapped_column(String(180), nullable=True)
    dimensions: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Job(Base):
    __tablename__ = 'jobs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey('identities.id'))
    source_id: Mapped[str | None] = mapped_column(ForeignKey('sources.id', ondelete='CASCADE'), nullable=True)
    memory_id: Mapped[str | None] = mapped_column(ForeignKey('memories.id', ondelete='CASCADE'), nullable=True)
    kind: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default='pending', index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    result: Mapped[dict] = mapped_column(JSONB, default=dict)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Idempotency(Base):
    __tablename__ = 'idempotency'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    kind: Mapped[str] = mapped_column(String(30))
    result_id: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Tombstone(Base):
    __tablename__ = 'tombstones'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(36), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    value: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Setting(Base):
    __tablename__ = 'settings'
    owner_id: Mapped[str] = mapped_column(ForeignKey('identities.id'), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, default=dict)


class Audit(Base):
    __tablename__ = 'audits'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(String(36), index=True)
    actor: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(50))
    target_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    detail: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ContextTrace(Base):
    __tablename__ = 'context_traces'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(String(36), index=True)
    actor: Mapped[str] = mapped_column(String(100))
    selected: Mapped[list] = mapped_column(JSONB)
    excluded: Mapped[list] = mapped_column(JSONB)
    budget: Mapped[int] = mapped_column(Integer)
    used: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
