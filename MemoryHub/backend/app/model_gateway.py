import json
import math
from urllib.parse import urlparse
import httpx
from fastapi import HTTPException
from .config import settings
from .models import Setting


def model_config(db, owner):
    row = db.get(Setting, owner)
    default = {'base_url': settings.model_base_url, 'generation_model': settings.generation_model,
               'embedding_model': settings.embedding_model, 'external': settings.model_external}
    return default | (row.value.get('model', {}) if row else {})


def validate_url(url):
    if not url:
        return
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise HTTPException(422, '模型地址必须是 http(s) 服务地址，不能包含凭证、查询或片段')


def request(cfg, endpoint, body, timeout=None):
    validate_url(cfg['base_url'])
    if not cfg['base_url']:
        raise HTTPException(503, '尚未配置模型服务；手动管理和关键词搜索仍可使用')
    try:
        with httpx.Client(timeout=timeout or settings.model_timeout, trust_env=False, follow_redirects=False) as client:
            response = client.post(cfg['base_url'].rstrip('/') + endpoint, json=body)
            response.raise_for_status()
            if len(response.content) > 4_000_000:
                raise ValueError('response too large')
            return response.json()
    except (httpx.HTTPError, ValueError) as e:
        # Never echo response bodies, headers or credential-bearing URLs into audit logs.
        raise HTTPException(503, '模型服务请求失败：' + type(e).__name__) from e


def chat(cfg, messages, json_mode=False):
    if not cfg['generation_model']:
        raise HTTPException(503, '尚未配置生成模型')
    body = {'model': cfg['generation_model'], 'stream': False, 'messages': messages}
    if json_mode:
        body['format'] = 'json'
    result = request(cfg, '/api/chat', body)
    try:
        return result['message']['content']
    except (KeyError, TypeError):
        raise HTTPException(503, '模型响应格式无效')


def embed(cfg, content, timeout=None):
    if not cfg['embedding_model']:
        raise HTTPException(503, '尚未配置 Embedding 模型')
    result = request(cfg, '/api/embed', {'model': cfg['embedding_model'], 'input': content, 'truncate': False}, timeout=timeout)
    try:
        vector = result['embeddings'][0]
        if not 1 <= len(vector) <= 16000 or not all(isinstance(x, (float, int)) and math.isfinite(x) for x in vector):
            raise ValueError()
        return vector
    except (KeyError, TypeError, IndexError, ValueError):
        raise HTTPException(503, 'Embedding 响应格式无效')
