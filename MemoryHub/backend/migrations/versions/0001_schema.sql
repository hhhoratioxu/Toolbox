CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE audits (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	actor VARCHAR(100) NOT NULL, 
	action VARCHAR(50) NOT NULL, 
	target_id VARCHAR(36), 
	detail JSONB NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_audits_owner_id ON audits (owner_id);

CREATE TABLE context_traces (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	actor VARCHAR(100) NOT NULL, 
	selected JSONB NOT NULL, 
	excluded JSONB NOT NULL, 
	budget INTEGER NOT NULL, 
	used INTEGER NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_context_traces_owner_id ON context_traces (owner_id);

CREATE TABLE idempotency (
	id VARCHAR(64) NOT NULL, 
	request_hash VARCHAR(64) NOT NULL, 
	kind VARCHAR(30) NOT NULL, 
	result_id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE identities (
	id VARCHAR(36) NOT NULL, 
	username VARCHAR(100) NOT NULL, 
	password_hash TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (username)
);

CREATE TABLE tombstones (
	id VARCHAR(64) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	kind VARCHAR(30) NOT NULL, 
	value VARCHAR(64) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_tombstones_owner_id ON tombstones (owner_id);

CREATE INDEX ix_tombstones_value ON tombstones (value);

CREATE TABLE agents (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	token_prefix VARCHAR(12) NOT NULL, 
	permissions JSONB NOT NULL, 
	external BOOLEAN NOT NULL, 
	service_label VARCHAR(200) NOT NULL, 
	revoked BOOLEAN NOT NULL, 
	last_seen TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES identities (id), 
	UNIQUE (token_hash)
);

CREATE INDEX ix_agents_owner_id ON agents (owner_id);

CREATE TABLE login_sessions (
	id VARCHAR(64) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES identities (id)
);

CREATE TABLE personas (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	config JSONB NOT NULL, 
	enabled BOOLEAN NOT NULL, 
	is_default BOOLEAN NOT NULL, 
	external_allowed BOOLEAN NOT NULL, 
	version INTEGER NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES identities (id)
);

CREATE INDEX ix_personas_owner_id ON personas (owner_id);

CREATE TABLE projects (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	name VARCHAR(180) NOT NULL, 
	description TEXT NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	version INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES identities (id)
);

CREATE INDEX ix_projects_owner_id ON projects (owner_id);

CREATE TABLE settings (
	owner_id VARCHAR(36) NOT NULL, 
	value JSONB NOT NULL, 
	PRIMARY KEY (owner_id), 
	FOREIGN KEY(owner_id) REFERENCES identities (id)
);

CREATE TABLE sources (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	project_id VARCHAR(36), 
	scope_key VARCHAR(100) NOT NULL, 
	category VARCHAR(30) NOT NULL, 
	title VARCHAR(240) NOT NULL, 
	kind VARCHAR(30) NOT NULL, 
	speaker VARCHAR(30) NOT NULL, 
	content TEXT NOT NULL, 
	checksum VARCHAR(64) NOT NULL, 
	sensitivity INTEGER NOT NULL, 
	external_allowed BOOLEAN NOT NULL, 
	blocked BOOLEAN NOT NULL, 
	retention_until TIMESTAMP WITH TIME ZONE, 
	created_by VARCHAR(100) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (owner_id, scope_key, checksum), 
	FOREIGN KEY(owner_id) REFERENCES identities (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id)
);

CREATE INDEX ix_sources_project_id ON sources (project_id);

CREATE INDEX ix_sources_owner_id ON sources (owner_id);

CREATE INDEX ix_sources_checksum ON sources (checksum);

CREATE TABLE memories (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	project_id VARCHAR(36), 
	category VARCHAR(30) NOT NULL, 
	title VARCHAR(240) NOT NULL, 
	body TEXT NOT NULL, 
	summary TEXT NOT NULL, 
	tags JSONB NOT NULL, 
	applicability VARCHAR(240) NOT NULL, 
	source_id VARCHAR(36) NOT NULL, 
	quote TEXT NOT NULL, 
	quote_start INTEGER NOT NULL, 
	quote_end INTEGER NOT NULL, 
	evidence_source_ids JSONB NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	provenance VARCHAR(30) NOT NULL, 
	importance INTEGER NOT NULL, 
	sensitivity INTEGER NOT NULL, 
	external_allowed BOOLEAN NOT NULL, 
	pinned BOOLEAN NOT NULL, 
	locked BOOLEAN NOT NULL, 
	version INTEGER NOT NULL, 
	fact_at TIMESTAMP WITH TIME ZONE, 
	valid_from TIMESTAMP WITH TIME ZONE, 
	valid_until TIMESTAMP WITH TIME ZONE, 
	created_by VARCHAR(100) NOT NULL, 
	updated_by VARCHAR(100) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES identities (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(source_id) REFERENCES sources (id)
);

CREATE INDEX ix_memories_source_id ON memories (source_id);

CREATE INDEX ix_memories_project_id ON memories (project_id);

CREATE INDEX ix_memory_scope_status ON memories (owner_id, project_id, status);

CREATE INDEX ix_memories_owner_id ON memories (owner_id);

CREATE INDEX ix_memories_status ON memories (status);

CREATE TABLE jobs (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	source_id VARCHAR(36), 
	memory_id VARCHAR(36), 
	kind VARCHAR(30) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	attempts INTEGER NOT NULL, 
	error TEXT, 
	result JSONB NOT NULL, 
	available_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	started_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES identities (id), 
	FOREIGN KEY(source_id) REFERENCES sources (id) ON DELETE CASCADE, 
	FOREIGN KEY(memory_id) REFERENCES memories (id) ON DELETE CASCADE
);

CREATE INDEX ix_jobs_status ON jobs (status);

CREATE TABLE relations (
	id VARCHAR(36) NOT NULL, 
	left_id VARCHAR(36) NOT NULL, 
	right_id VARCHAR(36) NOT NULL, 
	kind VARCHAR(30) NOT NULL, 
	resolved BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (left_id, right_id, kind), 
	FOREIGN KEY(left_id) REFERENCES memories (id) ON DELETE CASCADE, 
	FOREIGN KEY(right_id) REFERENCES memories (id) ON DELETE CASCADE
);

CREATE INDEX ix_relations_right_id ON relations (right_id);

CREATE INDEX ix_relations_left_id ON relations (left_id);

CREATE TABLE revisions (
	id VARCHAR(36) NOT NULL, 
	memory_id VARCHAR(36) NOT NULL, 
	version INTEGER NOT NULL, 
	snapshot JSONB NOT NULL, 
	reason VARCHAR(240) NOT NULL, 
	actor VARCHAR(100) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (memory_id, version), 
	FOREIGN KEY(memory_id) REFERENCES memories (id) ON DELETE CASCADE
);

CREATE INDEX ix_revisions_memory_id ON revisions (memory_id);

CREATE TABLE search_indexes (
	memory_id VARCHAR(36) NOT NULL, 
	version INTEGER NOT NULL, 
	terms TEXT NOT NULL, 
	embedding VECTOR, 
	model VARCHAR(180), 
	dimensions INTEGER, 
	PRIMARY KEY (memory_id), 
	FOREIGN KEY(memory_id) REFERENCES memories (id) ON DELETE CASCADE
);

CREATE INDEX ix_search_terms_zh ON search_indexes USING gin(to_tsvector('simple', terms));
