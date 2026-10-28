import hashlib
import secrets
from dataclasses import dataclass
from datetime import timedelta
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import HTTPException, Request
from sqlalchemy import select, and_, or_
from .models import Agent, LoginSession, Identity, now, Project
from .db import transaction
from .config import settings

hasher = PasswordHasher()


def digest(value: str):
    return hashlib.sha256(value.encode()).hexdigest()


@dataclass
class Principal:
    owner: str
    actor: str
    admin: bool
    permissions: dict
    external: bool = False
    service_label: str = '用户管理界面'

    def require(self, scope: str):
        if not self.admin and scope not in self.permissions.get('scopes', []):
            raise HTTPException(403, f'当前凭证缺少 {scope} 权限')


def from_agent(a):
    return Principal(a.owner_id, 'agent:' + a.id, False, a.permissions, a.external, a.service_label)


def authenticate(db, token: str, cookie=False):
    if not token:
        raise HTTPException(401, '请登录或提供有效的 Agent 凭证')
    hashed = digest(token)
    if cookie:
        session = db.get(LoginSession, hashed)
        if session and session.expires_at > now():
            return Principal(session.owner_id, 'user:' + session.owner_id, True, {})
    else:
        agent = db.scalar(select(Agent).where(Agent.token_hash == hashed, Agent.revoked.is_(False)))
        if agent:
            agent.last_seen = now()
            return from_agent(agent)
    raise HTTPException(401, '凭证已失效、撤销或过期')


def current_principal(request: Request):
    bearer = request.headers.get('authorization', '')
    with transaction() as db:
        if bearer:
            if not bearer.startswith('Bearer '):
                raise HTTPException(401, '请使用 Bearer 凭证')
            return authenticate(db, bearer[7:])
        return authenticate(db, request.cookies.get('mh_session', ''), cookie=True)


def admin_only(p: Principal):
    if not p.admin:
        raise HTTPException(403, '此操作仅限用户本人')


def scope_filter(cls, p: Principal):
    clauses = [cls.owner_id == p.owner]
    if p.admin:
        return and_(*clauses)
    perms = p.permissions
    project_terms = []
    if perms.get('all_projects'):
        project_terms.append(cls.project_id.is_not(None))
    elif perms.get('projects'):
        project_terms.append(cls.project_id.in_(perms['projects']))
    if perms.get('global_access'):
        project_terms.append(cls.project_id.is_(None))
    clauses.append(or_(*project_terms) if project_terms else False)
    clauses.extend([cls.category.in_(perms.get('categories', [])), cls.sensitivity <= perms.get('max_sensitivity', 0)])
    if p.external:
        clauses.append(cls.external_allowed.is_(True))
    if hasattr(cls, 'status'):
        clauses.append(cls.status == 'active')
    return and_(*clauses)


def project_access(db, p: Principal, project_id: str | None):
    if not project_id:
        if not p.admin and not p.permissions.get('global_access'):
            raise HTTPException(403, '凭证未授权全局范围')
        return
    project = db.get(Project, project_id)
    if not project or project.owner_id != p.owner:
        raise HTTPException(404, '项目不存在或不可访问')
    if not p.admin and not (p.permissions.get('all_projects') or project_id in p.permissions.get('projects', [])):
        raise HTTPException(404, '项目不存在或不可访问')
    return project


def write_scope(db, p: Principal, obj):
    project_access(db, p, obj.project_id)
    if not p.admin:
        if obj.category not in p.permissions.get('categories', []) or obj.sensitivity > p.permissions.get('max_sensitivity', 0):
            raise HTTPException(403, '分类或敏感级别超出凭证授权')
        if p.external and not obj.external_allowed:
            raise HTTPException(403, '外部 Agent 只能提交其获授权的外部可用数据')
