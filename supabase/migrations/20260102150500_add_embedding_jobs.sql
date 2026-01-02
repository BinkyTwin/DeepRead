-- Table pour gérer la queue de génération d'embeddings
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, complete, error
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  priority INTEGER DEFAULT 0, -- Plus prioritaire = plus petit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes pour la performance
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status ON embedding_jobs(status);
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_priority ON embedding_jobs(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_paper_id ON embedding_jobs(paper_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_embedding_jobs_updated_at
  BEFORE UPDATE ON embedding_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaire sur la table
COMMENT ON TABLE embedding_jobs IS 'Queue pour les jobs de génération d''embeddings';
COMMENT ON COLUMN embedding_jobs.status IS 'Statut du job: pending, processing, complete, error';
COMMENT ON COLUMN embedding_jobs.priority IS 'Priorité du job (plus petit = plus prioritaire)';
