-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable full text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes for better performance
-- Vector similarity index will be created by TypeORM when needed

-- Create function for hybrid search scoring
CREATE OR REPLACE FUNCTION hybrid_search_score(
    vector_similarity FLOAT,
    text_similarity FLOAT,
    vector_weight FLOAT DEFAULT 0.7,
    text_weight FLOAT DEFAULT 0.3
) RETURNS FLOAT AS $$
BEGIN
    RETURN (vector_similarity * vector_weight) + (text_similarity * text_weight);
END;
$$ LANGUAGE plpgsql IMMUTABLE;