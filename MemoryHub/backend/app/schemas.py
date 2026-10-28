from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

Category = Literal['profile', 'fact', 'project', 'event', 'knowledge', 'session']
Status = Literal['active', 'candidate', 'rejected', 'archived', 'trash', 'superseded', 'incorrect']


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')


class ProjectInput(Strict):
    name: str = Field(min_length=1, max_length=180)
    description: str = Field(default='', max_length=4000)
    status: Literal['active', 'paused', 'completed', 'archived'] = 'active'


class PersonaInput(Strict):
    name: str = Field(min_length=1, max_length=120)
    config: dict[str, str | bool] = Field(default_factory=dict)
    enabled: bool = True
    is_default: bool = False
    external_allowed: bool = False

    @model_validator(mode='after')
    def size(self):
        if len(str(self.config)) > 8000:
            raise ValueError('人格配置不得超过 8000 字符')
        return self


class Permissions(Strict):
    scopes: list[Literal['read', 'propose', 'update', 'export']] = Field(default_factory=lambda: ['read', 'propose'])
    projects: list[str] = Field(default_factory=list)
    all_projects: bool = False
    global_access: bool = False
    categories: list[Category] = Field(default_factory=lambda: ['project', 'knowledge', 'event', 'session'])
    max_sensitivity: int = Field(default=1, ge=0, le=3)
    persona_access: bool = True


class AgentInput(Strict):
    name: str = Field(min_length=1, max_length=120)
    permissions: Permissions = Field(default_factory=Permissions)
    external: bool = True
    service_label: str = Field(default='未指定外部服务', max_length=200)


class SourceInput(Strict):
    title: str = Field(min_length=1, max_length=240)
    content: str = Field(min_length=1, max_length=2_000_000)
    kind: Literal['note', 'txt', 'markdown', 'json', 'conversation', 'event', 'correction'] = 'note'
    speaker: Literal['user', 'assistant', 'quoted', 'unknown'] = 'unknown'
    project_id: str | None = None
    category: Category = 'knowledge'
    sensitivity: int = Field(default=1, ge=0, le=3)
    external_allowed: bool = False
    extract: bool = False


class MemoryInput(Strict):
    title: str = Field(min_length=1, max_length=240)
    body: str = Field(min_length=1, max_length=40000)
    summary: str = Field(default='', max_length=2000)
    category: Category = 'fact'
    project_id: str | None = None
    tags: list[str] = Field(default_factory=list, max_length=30)
    applicability: str = Field(default='', max_length=240)
    source_id: str | None = None
    quote: str = Field(default='', max_length=40000)
    provenance: Literal['user_entered', 'extracted', 'inferred'] = 'extracted'
    importance: int = Field(default=3, ge=1, le=5)
    sensitivity: int = Field(default=1, ge=0, le=3)
    external_allowed: bool = False
    pinned: bool = False
    locked: bool = False
    fact_at: datetime | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None

    @model_validator(mode='after')
    def dates(self):
        for v in (self.fact_at, self.valid_from, self.valid_until):
            if v and not v.tzinfo:
                raise ValueError('时间必须带时区')
        if self.valid_from and self.valid_until and self.valid_until <= self.valid_from:
            raise ValueError('失效时间必须晚于生效时间')
        if any(len(t) > 60 for t in self.tags):
            raise ValueError('标签过长')
        return self


class MemoryEdit(MemoryInput):
    expected_version: int = Field(ge=1)
    reason: str = Field(default='用户修改', max_length=240)


class ActionInput(Strict):
    expected_version: int = Field(ge=1)
    action: Literal['accept', 'reject', 'archive', 'trash', 'restore', 'pin', 'unpin', 'lock', 'unlock']


class ContextInput(Strict):
    query: str = Field(default='', max_length=4000)
    project_id: str | None = None
    persona_id: str | None = None
    budget: int = Field(default=4000, ge=0, le=32000)
    model_limit: int = Field(default=16000, ge=1, le=2_000_000)
    conversation_tokens: int = Field(default=0, ge=0, le=2_000_000)
    answer_reserve: int = Field(default=2000, ge=0, le=2_000_000)
    agent_id: str | None = None


class ResolveInput(Strict):
    relation_id: str
    winner_id: str
    winner_version: int = Field(ge=1)
    other_version: int = Field(ge=1)
    mode: Literal['correction', 'change', 'merge'] = 'correction'
    merged_body: str | None = Field(default=None, max_length=40000)
    effective_at: datetime | None = None


class PolicyInput(Strict):
    write_mode: Literal['manual', 'review', 'auto'] = 'review'
    auto_categories: list[Category] = Field(default_factory=list)
    auto_projects: list[str] = Field(default_factory=list)
    source_retention_days: int = Field(default=0, ge=0, le=36500)
    backup_retention_days: int = Field(default=30, ge=1, le=3650)


class ModelInput(Strict):
    base_url: str = Field(default='', max_length=500)
    generation_model: str = Field(default='', max_length=180)
    embedding_model: str = Field(default='', max_length=180)
    external: bool = False
