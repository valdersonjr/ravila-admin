DO $$
DECLARE
  prof_id      INT := 145; -- Flávia Mariany Oliveira
  t_toronto    INT; t_brazil     INT; t_los_angeles INT;
  t_rio        INT; t_paris      INT;
  t_ingrid     INT; t_nata       INT; t_danytza    INT;
  t_penelopy   INT; t_aquiles    INT; t_maria_alice INT;
  t_otavio     INT;
BEGIN

  -- ── Turmas de grupo ───────────────────────────────────────────────────────

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('TORONTO', prof_id, 'ativa') RETURNING id INTO t_toronto;

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('BRAZIL', prof_id, 'ativa') RETURNING id INTO t_brazil;

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('LOS ANGELES', prof_id, 'ativa') RETURNING id INTO t_los_angeles;

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('RIO', prof_id, 'ativa') RETURNING id INTO t_rio;

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('PARIS', prof_id, 'ativa') RETURNING id INTO t_paris;

  -- ── Individuais ───────────────────────────────────────────────────────────

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('INGRID INDIVIDUAL', prof_id, 'ativa') RETURNING id INTO t_ingrid;

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('NATÃ INDIVIDUAL', prof_id, 'ativa') RETURNING id INTO t_nata;

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('DANYTZA INDIVIDUAL', prof_id, 'ativa') RETURNING id INTO t_danytza;

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('PENELOPY INDIVIDUAL', prof_id, 'ativa') RETURNING id INTO t_penelopy;

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('AQUILES INDIVIDUAL', prof_id, 'ativa') RETURNING id INTO t_aquiles;

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('MARIA ALICE INDIVIDUAL', prof_id, 'ativa') RETURNING id INTO t_maria_alice;

  INSERT INTO turmas (nome, professor_id, status)
    VALUES ('OTÁVIO INDIVIDUAL', prof_id, 'ativa') RETURNING id INTO t_otavio;

  -- ── Horários ──────────────────────────────────────────────────────────────
  -- dia_semana: 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb

  -- TORONTO: Seg + Qua 14-15h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_toronto, 1, '14:00', '15:00'),
    (t_toronto, 3, '14:00', '15:00');

  -- BRAZIL: Ter + Qui 18-19h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_brazil, 2, '18:00', '19:00'),
    (t_brazil, 4, '18:00', '19:00');

  -- LOS ANGELES: Ter + Qui 19-20h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_los_angeles, 2, '19:00', '20:00'),
    (t_los_angeles, 4, '19:00', '20:00');

  -- RIO: Seg + Qua 17-18h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_rio, 1, '17:00', '18:00'),
    (t_rio, 3, '17:00', '18:00');

  -- PARIS: Seg + Qua 19-20h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_paris, 1, '19:00', '20:00'),
    (t_paris, 3, '19:00', '20:00');

  -- INGRID: Ter + Qui 17-18h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_ingrid, 2, '17:00', '18:00'),
    (t_ingrid, 4, '17:00', '18:00');

  -- NATÃ: Qui 15-16h, Sex 15-16h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_nata, 4, '15:00', '16:00'),
    (t_nata, 5, '15:00', '16:00');

  -- DANYTZA: Qui 20-21h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_danytza, 4, '20:00', '21:00');

  -- PENELOPY: Ter 20-21h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_penelopy, 2, '20:00', '21:00');

  -- AQUILES: Seg + Qua 20-21h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_aquiles, 1, '20:00', '21:00'),
    (t_aquiles, 3, '20:00', '21:00');

  -- MARIA ALICE: Ter + Qui 14-15h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_maria_alice, 2, '14:00', '15:00'),
    (t_maria_alice, 4, '14:00', '15:00');

  -- OTÁVIO: Ter 15-16h, Sex 15-16h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_otavio, 2, '15:00', '16:00'),
    (t_otavio, 5, '15:00', '16:00');

  RAISE NOTICE 'OK — 12 turmas e % horários criados para Flávia Mariany (pessoa_id=145).',
    (SELECT COUNT(*) FROM horarios_turma WHERE turma_id IN (
      t_toronto, t_brazil, t_los_angeles, t_rio, t_paris,
      t_ingrid, t_nata, t_danytza, t_penelopy, t_aquiles, t_maria_alice, t_otavio
    ));
END $$;
