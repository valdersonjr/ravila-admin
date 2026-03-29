DO $$
DECLARE
  prof_id     INT := 144; -- Michael Douglas Rodrigues da Silva
  t_alasca    INT; t_texas     INT; t_las_vegas INT;
  t_tunes     INT; t_ottawa    INT;
  t_nanda     INT; t_raphael   INT; t_julia     INT;
  t_carlos    INT; t_dhovanna  INT; t_gabriela  INT;
  t_filipe    INT;
BEGIN

  -- ── Turmas de grupo ───────────────────────────────────────────────────────

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('ALASCA', 'AEF 2', prof_id, 'ativa') RETURNING id INTO t_alasca;

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('TEXAS', 'AEF 1', prof_id, 'ativa') RETURNING id INTO t_texas;

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('LAS VEGAS', 'AEF 1', prof_id, 'ativa') RETURNING id INTO t_las_vegas;

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('TUNES', 'AEF 1', prof_id, 'ativa') RETURNING id INTO t_tunes;

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('OTTAWA', 'AEF 1', prof_id, 'ativa') RETURNING id INTO t_ottawa;

  -- ── Individuais ───────────────────────────────────────────────────────────

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('NANDA INDIVIDUAL', 'AEF 1', prof_id, 'ativa') RETURNING id INTO t_nanda;

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('RAPHAEL INDIVIDUAL', 'AEF 1', prof_id, 'ativa') RETURNING id INTO t_raphael;

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('JÚLIA INDIVIDUAL', 'AEF 1', prof_id, 'ativa') RETURNING id INTO t_julia;

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('CARLOS INDIVIDUAL', 'AEF 1', prof_id, 'ativa') RETURNING id INTO t_carlos;

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('DHOVANNA INDIVIDUAL', 'AEF 1', prof_id, 'ativa') RETURNING id INTO t_dhovanna;

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('GABRIELA INDIVIDUAL', 'AEF 3', prof_id, 'ativa') RETURNING id INTO t_gabriela;

  INSERT INTO turmas (nome, livro, professor_id, status)
    VALUES ('FILIPE INDIVIDUAL', 'AEF 1', prof_id, 'ativa') RETURNING id INTO t_filipe;

  -- ── Horários ──────────────────────────────────────────────────────────────
  -- dia_semana: 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb

  -- ALASCA: Seg + Qua 19-20h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_alasca, 1, '19:00', '20:00'),
    (t_alasca, 3, '19:00', '20:00');

  -- TEXAS: Ter + Qui 19-20h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_texas, 2, '19:00', '20:00'),
    (t_texas, 4, '19:00', '20:00');

  -- LAS VEGAS: Sex 19-20h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_las_vegas, 5, '19:00', '20:00');

  -- TUNES: Ter + Qui 20-21h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_tunes, 2, '20:00', '21:00'),
    (t_tunes, 4, '20:00', '21:00');

  -- OTTAWA: Sáb 07-08h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_ottawa, 6, '07:00', '08:00');

  -- NANDA: Seg 16-17h, Qui 15-16h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_nanda, 1, '16:00', '17:00'),
    (t_nanda, 4, '15:00', '16:00');

  -- RAPHAEL: Seg + Qua + Sex 17-18h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_raphael, 1, '17:00', '18:00'),
    (t_raphael, 3, '17:00', '18:00'),
    (t_raphael, 5, '17:00', '18:00');

  -- JÚLIA: Seg + Qua 18-19h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_julia, 1, '18:00', '19:00'),
    (t_julia, 3, '18:00', '19:00');

  -- CARLOS: Seg + Qua 20-21h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_carlos, 1, '20:00', '21:00'),
    (t_carlos, 3, '20:00', '21:00');

  -- DHOVANNA: Ter + Qui 16-17h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_dhovanna, 2, '16:00', '17:00'),
    (t_dhovanna, 4, '16:00', '17:00');

  -- GABRIELA: Ter 17-18h, Sex 18-19h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_gabriela, 2, '17:00', '18:00'),
    (t_gabriela, 5, '18:00', '19:00');

  -- FILIPE: Qua + Sex 16-17h
  INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim) VALUES
    (t_filipe, 3, '16:00', '17:00'),
    (t_filipe, 5, '16:00', '17:00');

  RAISE NOTICE 'OK — 12 turmas e % horários criados para Michael Douglas (pessoa_id=144).',
    (SELECT COUNT(*) FROM horarios_turma WHERE turma_id IN (
      t_alasca, t_texas, t_las_vegas, t_tunes, t_ottawa,
      t_nanda, t_raphael, t_julia, t_carlos, t_dhovanna, t_gabriela, t_filipe
    ));
END $$;
