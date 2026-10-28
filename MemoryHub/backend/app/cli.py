import argparse
import getpass
import json
import os
from pathlib import Path
from sqlalchemy import select
from .db import transaction
from .models import Identity, Setting, Persona
from .auth import hasher, Principal
from .lifecycle import create_backup, restore_backup


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['init', 'backup', 'restore'])
    parser.add_argument('--username', default='admin')
    parser.add_argument('--password-file')
    parser.add_argument('--file')
    args = parser.parse_args()
    with transaction() as db:
        user = db.scalar(select(Identity))
        if args.command == 'init':
            if user:
                print('已初始化；现有账户未修改。')
                return
            password = Path(args.password_file).read_text().strip() if args.password_file else getpass.getpass('设置管理员密码（至少 12 位）：')
            if len(password) < 12:
                raise SystemExit('密码至少 12 位')
            user = Identity(username=args.username, password_hash=hasher.hash(password))
            db.add(user)
            db.flush()
            db.add(Setting(owner_id=user.id, value={}))
            db.add(Persona(owner_id=user.id, name='默认助手', is_default=True, config={'role':'严谨且友好的助手', 'language':'简体中文',
                'tone':'自然、直接', 'length':'按问题复杂度调整', 'depth':'先给结论，再解释依据', 'proactive':True,
                'uncertainty':'明确区分事实、推测和未验证内容', 'preferences':'执行操作后报告真实结果；尊重当前明确指令。'}))
            print('初始化完成，用户名：' + user.username)
            return
        if not args.file:
            raise SystemExit('需要 --file')
        if args.command == 'restore':
            backup = json.loads(Path(args.file).read_text())
            owner = user.id if user else backup['owner_id']
            p = Principal(owner, 'cli:' + owner, True, {})
            restore_backup(db, p, backup)
            print('恢复完成；删除日志已应用；请重新登录并签发 Agent 凭证。')
        else:
            if not user:
                raise SystemExit('请先初始化')
            backup = create_backup(db, Principal(user.id, 'cli:' + user.id, True, {}))
            fd = os.open(args.file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'w') as file:
                json.dump(backup, file, ensure_ascii=False, indent=2)
            print('备份已保存到指定文件；请加密保管。')


if __name__ == '__main__':
    main()
