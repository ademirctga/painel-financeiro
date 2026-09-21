-- Previne lancamentos duplicados gerados por recorrências no mesmo mês.
-- Índice parcial: só se aplica a registros não deletados com recorrencia_id preenchido.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lanc_recorrencia_mes
  ON lancamentos (user_id, recorrencia_id, data_competencia)
  WHERE recorrencia_id IS NOT NULL AND deleted_at IS NULL;
