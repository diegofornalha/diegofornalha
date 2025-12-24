# Claude RAG SDK

RAG SDK for Claude with AgentFS integration - Semantic search, hybrid search, and AI-powered Q&A.

[![PyPI version](https://badge.fury.io/py/claude-rag-sdk.svg)](https://badge.fury.io/py/claude-rag-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Semantic Search**: Fast vector search using FastEmbed + sqlite-vec
- **Hybrid Search**: Combine BM25 (lexical) with vector search
- **Document Ingestion**: Support for PDF, DOCX, HTML, TXT, Markdown
- **AI-Powered Q&A**: Ask questions with citations using Claude
- **AgentFS Integration**: Built-in filesystem, KV store, and audit trails
- **Enterprise Ready**: RBAC, prompt guard, circuit breaker, caching

## Installation

```bash
pip install claude-rag-sdk
```

Or with all extras:

```bash
pip install claude-rag-sdk[all]
```

## Quick Start

```python
import asyncio
from claude_rag_sdk import ClaudeRAG, ClaudeRAGOptions

async def main():
    # Open a RAG instance
    async with await ClaudeRAG.open(ClaudeRAGOptions(id='my-agent')) as rag:
        # Add documents
        await rag.ingest.add_document('manual.pdf')
        await rag.ingest.add_text(
            "RAG stands for Retrieval-Augmented Generation...",
            source="notes.txt"
        )

        # Search
        results = await rag.search('What is RAG?')
        for r in results:
            print(f"{r.source}: {r.similarity:.2f}")
            print(r.content[:200])

        # Hybrid search (semantic + BM25)
        results = await rag.search_hybrid('RAG architecture', vector_weight=0.7)

        # Ask questions with AI
        response = await rag.query('Explain RAG in detail')
        print(response.answer)
        for citation in response.citations:
            print(f"Source: {citation['source']}")

        # Use AgentFS features
        await rag.kv.set('last_query', 'What is RAG?')
        await rag.fs.write_file('/output/report.txt', response.answer)

asyncio.run(main())
```

## Configuration

```python
from claude_rag_sdk import (
    ClaudeRAG,
    ClaudeRAGOptions,
    EmbeddingModel,
    ChunkingStrategy,
    AgentModel,
)

options = ClaudeRAGOptions(
    id='my-agent',

    # Embedding model
    embedding_model=EmbeddingModel.BGE_BASE,  # BGE_SMALL, BGE_BASE, BGE_LARGE

    # Chunking
    chunk_size=500,
    chunk_overlap=50,
    chunking_strategy=ChunkingStrategy.FIXED,  # FIXED, SENTENCE, PARAGRAPH

    # Agent
    agent_model=AgentModel.HAIKU,  # HAIKU, SONNET, OPUS

    # Features
    enable_reranking=True,
    enable_adaptive_topk=True,
    enable_prompt_guard=True,
    enable_hybrid_search=True,

    # Search defaults
    default_top_k=5,
    vector_weight=0.7,

    # Cache
    cache_ttl=3600,
    cache_max_size=1000,
)

rag = await ClaudeRAG.open(options)
```

### Environment Variables

```bash
export CLAUDE_RAG_ID=my-agent
export CLAUDE_RAG_EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
export CLAUDE_RAG_ENABLE_RERANKING=true
export CLAUDE_RAG_DEFAULT_TOP_K=5
```

```python
options = ClaudeRAGOptions.from_env()
```

## API Reference

### ClaudeRAG

Main class that provides unified access to all RAG features.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `kv` | KvStore | AgentFS key-value store |
| `fs` | Filesystem | AgentFS filesystem |
| `tools` | ToolCalls | AgentFS tool tracking |
| `ingest` | IngestEngine | Document ingestion |
| `search_engine` | SearchEngine | Direct search access |

#### Methods

```python
# Search
results = await rag.search(query, top_k=5)
results = await rag.search_hybrid(query, vector_weight=0.7)
doc = await rag.get_document(doc_id)
sources = await rag.list_sources()

# Ingest (convenience)
result = await rag.add_document('file.pdf')
result = await rag.add_text('content', source='note.txt')

# Agent
response = await rag.query('question')
async for chunk in rag.query_stream('question'):
    print(chunk.text, end='')

# Stats
stats = await rag.stats()
```

### SearchResult

```python
@dataclass
class SearchResult:
    doc_id: int
    source: str
    content: str
    similarity: float
    doc_type: Optional[str]
    rerank_score: Optional[float]
    rank: Optional[int]
```

### AgentResponse

```python
@dataclass
class AgentResponse:
    answer: str
    citations: list[dict]  # [{"source": "...", "quote": "..."}]
    confidence: float
    tool_calls: list[dict]
    tokens_used: int
```

### IngestResult

```python
@dataclass
class IngestResult:
    success: bool
    doc_id: Optional[int]
    chunks: int
    source: Optional[str]
    error: Optional[str]
```

## Architecture

```
┌─────────────────────────────────────┐
│         Claude RAG SDK              │
│  ┌───────────────────────────────┐  │
│  │ ClaudeRAG (Main Interface)    │  │
│  │  - search()                   │  │
│  │  - search_hybrid()            │  │
│  │  - query()                    │  │
│  │  - ingest                     │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ AgentFS  │ │ Search   │ │ Ingest   │
│  - kv    │ │ Engine   │ │ Engine   │
│  - fs    │ │  - vec   │ │  - chunk │
│  - tools │ │  - bm25  │ │  - embed │
└──────────┘ └──────────┘ └──────────┘
```

## Core Modules

The SDK includes battle-tested core modules:

- **Cache**: LRU cache with TTL for embeddings and responses
- **Circuit Breaker**: Protect against cascading failures
- **Hybrid Search**: BM25 + vector search fusion
- **Reranker**: Cross-encoder reranking for precision
- **Prompt Guard**: Detect prompt injection attacks
- **RBAC**: Role-based access control
- **Logger**: Structured logging with context

## Examples

### Basic Search

```python
from claude_rag_sdk import ClaudeRAG, ClaudeRAGOptions

async def search_example():
    rag = await ClaudeRAG.open(ClaudeRAGOptions(id='search-demo'))

    # Add some documents
    await rag.add_text(
        "Machine learning is a subset of artificial intelligence...",
        source="ml-intro.txt"
    )

    # Search
    results = await rag.search("What is machine learning?")

    for r in results:
        print(f"[{r.rank}] {r.source} (score: {r.similarity:.2f})")
        print(f"    {r.content[:100]}...")

    await rag.close()
```

### Q&A with Citations

```python
async def qa_example():
    async with await ClaudeRAG.open(ClaudeRAGOptions(id='qa-demo')) as rag:
        # Add documentation
        await rag.add_document('docs/architecture.pdf')
        await rag.add_document('docs/api-reference.md')

        # Ask questions
        response = await rag.query(
            "How does the authentication system work?"
        )

        print(f"Answer: {response.answer}")
        print(f"Confidence: {response.confidence:.0%}")

        print("\nSources:")
        for c in response.citations:
            print(f"  - {c['source']}: \"{c['quote'][:50]}...\"")
```

### With AgentFS State

```python
async def stateful_example():
    async with await ClaudeRAG.open(ClaudeRAGOptions(id='stateful-demo')) as rag:
        # Track conversation
        await rag.kv.set('session:user', {'name': 'Alice', 'role': 'admin'})

        # Search and save results
        results = await rag.search('security best practices')

        # Save to filesystem
        report = "\n".join([f"- {r.source}: {r.content[:100]}" for r in results])
        await rag.fs.write_file('/reports/security.txt', report)

        # Track the operation
        stats = await rag.tools.get_stats()
        print(f"Tool calls: {stats}")
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [GitHub Repository](https://github.com/diegofornalha/claude_rag_sdk)
- [AgentFS SDK](https://github.com/tursodatabase/agentfs)
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)
- [FastEmbed](https://github.com/qdrant/fastembed)
