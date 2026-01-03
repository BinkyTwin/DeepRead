-- Table pour gérer les locks de génération d'embeddings (concurrence control)
-- Évite que plusieurs requêtes génèrent des embeddings pour le même paper

CREATE TABLE IF NOT EXISTS embedding_locks (
  paper_id UUID PRIMARY KEY REFERENCES papers(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performance (cleanup)
CREATE INDEX IF NOT EXISTS idx_embedding_locks_expires_at ON embedding_locks(expires_at);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_embedding_locks_updated_at
  BEFORE UPDATE ON embedding_locks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour nettoyer les locks expirés
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM embedding_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON TABLE embedding_locks IS 'Locks pour éviter la génération parallèle d''embeddings pour un même paper';
COMMENT ON COLUMN embedding_locks.expires_at IS 'Lock expire automatiquement après 30 minutes';
COMMENT ON FUNCTION cleanup_expired_locks() IS 'Nettoie les locks expirés (à appeler régulièrement)';
