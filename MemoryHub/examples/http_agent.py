"""HTTP checkpoint adapter. The calling agent must explicitly invoke hooks."""
import argparse
import json
import os
import uuid
import httpx


class MemoryHub:
    def __init__(self):
        self.client = httpx.Client(base_url=os.environ['MEMORY_HUB_URL'].rstrip('/') + '/api/',
                                  headers={'Authorization': 'Bearer ' + os.environ['MEMORY_HUB_TOKEN']},
                                  timeout=30, trust_env=False)

    def call(self, path, body, key=None):
        # Reuse this key for every network retry of this logical operation.
        key = key or str(uuid.uuid4())
        for attempt in range(2):
            try:
                response = self.client.post(path, json=body, headers={'Idempotency-Key':key})
                response.raise_for_status()
                return response.json()
            except httpx.TransportError:
                if attempt:
                    raise

    def start_session(self, project_id, query, budget=4000):
        return self.call('context', {'project_id': project_id, 'query': query, 'budget': budget})

    def acknowledge(self, trace_id):
        # Call only after the caller has actually inserted context into its prompt.
        return self.call('context/' + trace_id + '/ack', {})

    def checkpoint(self, project_id, authorized_user_text, event_id):
        return self.call('sources', {'title':'授权会话检查点', 'content':authorized_user_text, 'project_id':project_id,
                         'category':'session', 'kind':'conversation', 'speaker':'user', 'extract':True}, event_id)

    def propose(self, project_id, title, body, event_id):
        return self.call('proposals', {'project_id':project_id, 'category':'project', 'title':title, 'body':body}, event_id)


def main():
    p=argparse.ArgumentParser()
    p.add_argument('action', choices=['context','checkpoint','propose','export'])
    p.add_argument('--project')
    p.add_argument('--query', default='继续当前项目')
    p.add_argument('--text', default='')
    p.add_argument('--title', default='Agent 提出的新记忆')
    p.add_argument('--event-id', default=None)
    args=p.parse_args();hub=MemoryHub()
    try:
        if args.action=='context': result=hub.start_session(args.project,args.query)
        elif args.action=='checkpoint': result=hub.checkpoint(args.project,args.text,args.event_id or str(uuid.uuid4()))
        elif args.action=='propose': result=hub.propose(args.project,args.title,args.text,args.event_id or str(uuid.uuid4()))
        else:
            result=[];offset=0
            while True:
                response=hub.client.get('export',params={'offset':offset,'limit':100,**({'project_id':args.project} if args.project else {})})
                response.raise_for_status();page=response.json();result+=page['items']
                if page['next_offset'] is None: break
                offset=page['next_offset']
        print(json.dumps(result,ensure_ascii=False,indent=2))
    except httpx.HTTPError as e:
        # Do not falsely report remembering on failures.
        raise SystemExit('Memory Hub 操作失败；未确认保存。' + type(e).__name__)


if __name__=='__main__': main()
