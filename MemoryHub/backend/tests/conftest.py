import os
import shutil
from pathlib import Path
os.environ['DATABASE_URL'] = os.environ.get('TEST_DATABASE_URL', 'postgresql+psycopg://memoryhub@127.0.0.1:55439/memoryhub_test')
os.environ['DATA_DIR'] = os.environ.get('TEST_DATA_DIR', str(Path(__file__).resolve().parents[2] / '.local' / 'test-data'))
os.environ['COOKIE_SECURE'] = 'false'
os.environ['PUBLIC_URL'] = 'http://testserver'
os.environ['MODEL_BASE_URL'] = ''
import pytest
from sqlalchemy import text
from alembic.config import Config
from alembic import command
from fastapi.testclient import TestClient
from app.db import engine, transaction, Base
from app.models import Identity, Setting, Persona
from app.auth import hasher
from app.api import app


@pytest.fixture(scope='session', autouse=True)
def schema():
    assert 'test' in str(engine.url.database), 'Tests require a separate test database'
    command.upgrade(Config('alembic.ini'), 'head')


@pytest.fixture(scope='session')
def http_client(schema):
    with TestClient(app, base_url='http://testserver', headers={'Origin':'http://testserver'}) as c:
        yield c


@pytest.fixture
def client(http_client):
    with engine.begin() as conn:
        conn.execute(text('TRUNCATE TABLE ' + ','.join(t.name for t in Base.metadata.sorted_tables) + ' CASCADE'))
    root = Path(os.environ['DATA_DIR'])
    shutil.rmtree(root, ignore_errors=True)
    (root / 'sources').mkdir(parents=True)
    with transaction() as db:
        user = Identity(username='admin', password_hash=hasher.hash('TestPassword-Only-2026'))
        db.add(user)
        db.flush()
        db.add(Setting(owner_id=user.id, value={}))
        db.add(Persona(owner_id=user.id, name='默认助手', config={'language':'简体中文'}, is_default=True))
    c = http_client
    c.cookies.clear()
    assert c.post('/api/login', json={'username':'admin','password':'TestPassword-Only-2026'}).status_code == 200
    yield c
