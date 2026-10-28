"""Official MCP SDK 2.3.0 Streamable HTTP client; no embedded credentials."""
import argparse
import asyncio
import json
import os
import httpx2
from mcp import Client
from mcp.client.streamable_http import streamable_http_client


async def main():
    p=argparse.ArgumentParser();p.add_argument('--project');p.add_argument('--query',default='继续当前项目');args=p.parse_args()
    url=os.environ['MEMORY_HUB_URL'].rstrip('/')+'/mcp/'
    async with httpx2.AsyncClient(headers={'Authorization':'Bearer '+os.environ['MEMORY_HUB_TOKEN']},timeout=30,trust_env=False) as http:
        transport=streamable_http_client(url,http_client=http)
        async with Client(transport) as client:
            result=await client.call_tool('get_context',{'request':{'project_id':args.project,'query':args.query,'budget':4000}})
            if result.is_error:
                raise RuntimeError('记忆读取失败，不得声称已加载上下文')
            print(json.dumps(result.structured_content,ensure_ascii=False,indent=2))
            # The embedding agent should insert the returned text, THEN call acknowledge_context.


if __name__=='__main__': asyncio.run(main())
