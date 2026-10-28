import json
import os
from datetime import datetime
from sqlalchemy import select, delete, text
from fastapi import HTTPException
from .db import Base
from .models import *
from .auth import admin_only
from .memory import dump, current_memory, add_tombstone, content_hash, source_path, mirror_source, log, check_version, serial_lock


def impact(db, p, memory_id):
    admin_only(p)
    current_memory(db, p, memory_id)
    all_mem = db.scalars(select(Memory).where(Memory.owner_id == p.owner)).all()
    memories, sources = {memory_id}, set()
    # Compute transitive provenance closure, including merged and historical evidence.
    changed = True
    while changed:
        before = (len(memories), len(sources))
        for m in all_mem:
            evidence = set(m.evidence_source_ids + [m.source_id])
            if m.id in memories or evidence & sources:
                memories.add(m.id)
                sources |= evidence
        changed = before != (len(memories), len(sources))
    return {'memory_ids': sorted(memories), 'sources': [dump(s, omit=('content',)) for s in db.scalars(select(Source).where(Source.id.in_(sources))).all()],
            'memories': [{'id': m.id, 'title': m.title, 'version': m.version} for m in all_mem if m.id in memories],
            'warning': '彻底遗忘会清理整条来源链及其派生记忆。删除模式移除关联原文；脱敏模式将整份原文替换为占位文本。已发送到外部客户端的副本无法撤回。'}


def purge_ids(db, memory_ids, source_ids, mode='delete'):
    memory_ids, source_ids = set(memory_ids), set(source_ids)
    for trace in db.scalars(select(ContextTrace)).all():
        selected = [x for x in trace.selected if x['id'] not in memory_ids | source_ids and x.get('source_id') not in source_ids]
        excluded = [x for x in trace.excluded if x['id'] not in memory_ids | source_ids]
        if selected != trace.selected or excluded != trace.excluded:
            trace.selected, trace.excluded, trace.status = selected, excluded, 'invalidated'
    db.execute(delete(Idempotency).where(Idempotency.result_id.in_(memory_ids | source_ids)))
    db.execute(delete(Memory).where(Memory.id.in_(memory_ids)))
    db.flush()
    for source_id in source_ids:
        s = db.get(Source, source_id)
        if s:
            if mode == 'redact':
                s.content, s.title, s.blocked = '[已彻底遗忘：原文已整体脱敏]', '[已脱敏来源]', True
                from .auth import digest
                s.checksum = digest(s.content + s.id)
                mirror_source(s)
                db.execute(delete(Job).where(Job.source_id == s.id))
            else:
                db.delete(s)
                source_path(source_id).unlink(missing_ok=True)


def forget(db, p, memory_id, expected_version, mode, confirm_ids):
    admin_only(p)
    serial_lock(db, 'write:' + p.owner)
    m = current_memory(db, p, memory_id, lock=True)
    check_version(m, expected_version)
    preview = impact(db, p, memory_id)
    if sorted(confirm_ids) != preview['memory_ids']:
        raise HTTPException(409, '来源影响发生变化，请重新预览并确认完整影响范围')
    if mode not in ('delete', 'redact'):
        raise HTTPException(422, '无效的原文处理方式')
    source_ids = [x['id'] for x in preview['sources']]
    for mid in preview['memory_ids']:
        row = db.get(Memory, mid)
        add_tombstone(db, p.owner, 'memory', mid, journal=True)
        for revision in db.scalars(select(Revision).where(Revision.memory_id == mid)).all():
            add_tombstone(db, p.owner, 'content', content_hash(revision.snapshot['body']), journal=True)
    for sid in source_ids:
        s = db.get(Source, sid)
        add_tombstone(db, p.owner, 'source', sid, journal=True)
        add_tombstone(db, p.owner, 'source_hash', s.checksum, journal=True)
    db.flush()
    purge_ids(db, preview['memory_ids'], source_ids, mode)
    log(db, p, 'memory.forget', memory_id, count=len(preview['memory_ids']), sources=len(source_ids), mode=mode)
    return {'forgotten': preview['memory_ids'], 'sources_processed': source_ids, 'mode': mode}


def replay_deletions(db):
    from .config import settings
    path = settings.data_dir / 'deletion-ledger.jsonl'
    if path.exists():
        for line in path.read_text().splitlines():
            try:
                item = json.loads(line)
            except ValueError:
                # A corrupt ledger fails closed; it must never silently permit resurrection.
                raise RuntimeError('删除日志损坏，拒绝启动或恢复')
            if not db.get(Tombstone, item['id']):
                db.add(Tombstone(**item))
    db.flush()
    tombstones = db.scalars(select(Tombstone)).all()
    mid = {t.value for t in tombstones if t.kind == 'memory'}
    sid = {t.value for t in tombstones if t.kind == 'source'}
    hashes = {t.value for t in tombstones if t.kind == 'source_hash'}
    for s in db.scalars(select(Source)).all():
        if s.checksum in hashes:
            sid.add(s.id)
    for m in db.scalars(select(Memory)).all():
        if set(m.evidence_source_ids + [m.source_id]) & sid:
            mid.add(m.id)
    purge_ids(db, mid, sid)


BACKUP_TABLES = [Identity, Project, Agent, Persona, Source, Memory, Revision, Relation, Job, Setting, Tombstone]


def create_backup(db, p):
    admin_only(p)
    db.execute(text('LOCK TABLE ' + ','.join(sorted(c.__tablename__ for c in BACKUP_TABLES)) + ' IN SHARE MODE'))
    # Single-owner v1: all exported tables are checked against the sole identity.
    identities = db.scalars(select(Identity)).all()
    if len(identities) != 1 or identities[0].id != p.owner:
        raise HTTPException(409, '此备份格式仅支持单用户数据库')
    result = {'format': 'memory-hub-backup-v1', 'created_at': now().isoformat(), 'owner_id': p.owner,
              'tables': {cls.__tablename__: [dump(row) for row in db.scalars(select(cls)).all()] for cls in BACKUP_TABLES},
              'notice': '含敏感正文与密码校验值，必须加密保管。恢复时撤销所有 Agent 令牌与登录会话，并应用当前删除日志。检索索引重建。'}
    log(db, p, 'backup.create')
    return result


def restore_backup(db, p, backup):
    admin_only(p)
    serial_lock(db, 'write:' + p.owner)
    if backup.get('format') != 'memory-hub-backup-v1' or backup.get('owner_id') != p.owner:
        raise HTTPException(422, '备份版本或所有者不匹配；跨服务器恢复请使用 CLI')
    tables = backup.get('tables', {})
    if set(tables) != {cls.__tablename__ for cls in BACKUP_TABLES}:
        raise HTTPException(422, '备份缺少数据表或包含未知表')
    existing_deletions = [dump(t) for t in db.scalars(select(Tombstone)).all()]
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(delete(table))
    db.flush()
    db.expunge_all()
    # Validate every column through SQLAlchemy types, never execute statements from a backup.
    for cls in BACKUP_TABLES:
        cols = {c.name: c for c in cls.__table__.columns}
        for raw in tables[cls.__tablename__]:
            if set(raw) != set(cols):
                raise HTTPException(422, '备份字段与当前结构不兼容')
            row = dict(raw)
            if 'owner_id' in row and row['owner_id'] != p.owner:
                raise HTTPException(422, '备份包含其他所有者')
            for key, col in cols.items():
                if isinstance(col.type, DateTime) and row[key]:
                    row[key] = datetime.fromisoformat(row[key])
            if cls is Agent:
                row['revoked'] = True
            if cls is Job and row['status'] in ('processing', 'retrying'):
                row['status'] = 'pending'
            db.add(cls(**row))
        db.flush()
    for row in existing_deletions:
        if not db.get(Tombstone, row['id']):
            row['created_at'] = datetime.fromisoformat(row['created_at'])
            db.add(Tombstone(**row))
    db.flush()
    replay_deletions(db)
    from .retrieval import terms
    for m in db.scalars(select(Memory)).all():
        db.add(SearchIndex(memory_id=m.id, version=m.version, terms=' '.join(terms(m.title + ' ' + m.body))))
        db.add(Job(owner_id=m.owner_id, memory_id=m.id, kind='embed'))
    from .config import settings
    current_ids = set(db.scalars(select(Source.id)).all())
    for file in (settings.data_dir / 'sources').glob('*.txt'):
        if file.stem not in current_ids:
            file.unlink()
    for s in db.scalars(select(Source)).all():
        mirror_source(s)
    log(db, p, 'backup.restore')
    return {'restored': True, 'agents_revoked': True, 'deletions_applied': True}
