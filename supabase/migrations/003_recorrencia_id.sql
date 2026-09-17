-- Add recorrencia_id to lancamentos for tracking auto-generated entries
ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS recorrencia_id uuid REFERENCES recorrencias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lancamentos_recorrencia_id ON lancamentos(recorrencia_id);
