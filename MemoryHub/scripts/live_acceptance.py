"""Live HTTP + official MCP SDK integration; writes only clearly labelled acceptance records."""
import asyncio
from contextlib import contextmanager
import json
import os
from pathlib import Path
import sys
import uuid
import httpx
import httpx2
from mcp import Client
from mcp.client.streamable_http import streamable_http_client

ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('MEMORY_HUB_URL','http://127.0.0.1:8765')
private=ROOT/'.local/live-clients.json'

@contextmanager
def admin():
    c=httpx.Client(base_url=URL,headers={'Origin':URL},timeout=30,trust_env=False)
    r=c.post('/api/login',json={'username':'admin','password':(ROOT/'.local/admin-password').read_text().strip()});r.raise_for_status()
    try:
        yield c
    finally:
        c.close()

def send(c,path,data):
    r=c.post('/api'+path,json=data,headers={'Idempotency-Key':str(uuid.uuid4())});r.raise_for_status();return r.json()

async def main():
    phase=sys.argv[1] if len(sys.argv)>1 else 'prepare'
    with admin() as c:
        pid=next(p['id'] for p in c.get('/api/projects').json()['items'] if p['name']=='Memory Hub 本机验收')
        if phase=='prepare':
            tokens=[]
            for name in ['[验收] HTTP 客户端 A','[验收] MCP 客户端 B']:
                a=send(c,'/agents',{'name':name,'external':False,'service_label':'本机适配器验收',
                    'permissions':{'projects':[pid],'scopes':['read','propose','update','export'],'categories':['project','session','knowledge'],'max_sensitivity':2}})
                tokens.append(a['token'])
            payload={'title':'[跨 Agent 验收] 下一步计划','body':'验收数据：下一步验证来源追溯、跨设备读取和候选审核。','category':'project','project_id':pid}
            a=httpx.Client(base_url=URL,headers={'Authorization':'Bearer '+tokens[0]},trust_env=False)
            r=a.post('/api/proposals',json=payload,headers={'Idempotency-Key':'live-acceptance-first-proposal'});r.raise_for_status()
            mem=r.json()['memory'];a.close()
            creds={'project_id':pid,'tokens':tokens,'memory_id':mem['id']}
            private.write_text(json.dumps(creds));private.chmod(0o600)
            print(json.dumps({'candidate_id':mem['id'],'status':mem['status'],'source_id':mem['source_id']}))
        else:
            creds=json.loads(private.read_text())
        async with httpx2.AsyncClient(headers={'Authorization':'Bearer '+creds['tokens'][1]},timeout=30,trust_env=False) as h:
            async with Client(streamable_http_client(URL+'/mcp/',http_client=h)) as mc:
                listed=await mc.list_tools()
                context=await mc.call_tool('get_project_context',{'project_id':pid,'query':'部署约束 下一步计划','budget':4000})
                assert not context.is_error, str(context.content)
                result=context.structured_content
                if 'result' in result: result=result['result']
                assert result['budget']['used']<=4000
                if phase=='verify':
                    r=await mc.call_tool('get_memory',{'memory_id':creds['memory_id']})
                    assert not r.is_error,str(r.content)
                    data=r.structured_content
                    if 'result' in data:data=data['result']
                    assert data['status']=='active' and data['version']>=3
                    assert '已通过网页纠正' in data['body']
                    assert data['source']['id']==data['source_id']
                    new_session=await mc.call_tool('get_context',{'request':{'project_id':pid,'query':'下一步计划'}})
                    assert not new_session.is_error
                    ctx=new_session.structured_content
                    if 'result' in ctx:ctx=ctx['result']
                    assert any(x['id']==data['id'] and x['version']==data['version'] for x in ctx['selected'])
                    ack=await mc.call_tool('acknowledge_context',{'trace_id':ctx['trace_id']})
                    assert not ack.is_error
                    evidence={'http_client_A_to_mcp_client_B':True,'web_correction_read_back':True,'source_verified':True,
                              'new_session_context':True,'client_acknowledged':True,'memory_id':data['id'],'version':data['version'],
                              'budget':ctx['budget'],'tools':[t.name for t in listed.tools]}
                    (ROOT/'artifacts/live-verification.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
                    print(json.dumps(evidence,ensure_ascii=False))
                else: print('Official MCP SDK connected; project context returned within budget.')

asyncio.run(main())
