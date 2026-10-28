"""Initial immutable Memory Hub schema."""
from pathlib import Path
from alembic import op
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    sql = (Path(__file__).parent / '0001_schema.sql').read_text()
    for statement in sql.split(';'):
        if statement.strip():
            op.execute(statement)


def downgrade():
    raise RuntimeError('拒绝破坏性降级；请先备份并按恢复文档操作')
