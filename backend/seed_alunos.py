"""
Seed script — importa alunos da planilha inicial.

Executar dentro do container:
    docker-compose exec app python seed_alunos.py
"""
import re
import sys
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.pessoa import Pessoa
from app.models.aluno import Aluno

# ---------------------------------------------------------------------------
# Dados da planilha — já limpos (parênteses removidos, nomes normalizados)
# Campos: nome_aluno, aniversario, telefone, endereco, cpf_resp, rg_resp,
#         curso, nome_responsavel (None = adulto, mesmo que aluno)
# ---------------------------------------------------------------------------
DADOS = [
    ("Lorena de Oliveira Silva",           "24/10", "(62)98442-1011",  "RUA 3, Nº371 NEGRINHO CARRILHO",                           "924.614.921-15", "4315247", "REGULAR", "Lorena de Oliveira Silva"),
    ("Geovanna Lissa Bernardes Oliveira",  "04/09", "(62)98629-5246",  "RUA 22, N 198, MUNIS FALCAO",                              "702.904.131-33", None,      "REGULAR", "Geovanna Lissa Bernardes Oliveira"),
    ("Maria Eduarda",                      "16/05", "(62)984198262",   "RUA 36 N 515 B:NOVA AURORA",                               "711.330.691-85", None,      "REGULAR", "Rosangela Arreira de Queiros"),
    ("Penelopy",                           "08/02", "(62)984605018",   "RUA 12 QD:15 COLINA PARK",                                 "009.748.391-59", None,      "REGULAR", "Lais Leite Moraes Lacerda"),
    ("Lucas Ottoni",                       "06/01", "(62)98484-3936",  None,                                                       "019.627.261-00", None,      "KIDS",    "Claudia Ottoni da Silva"),
    ("Luiza Barbara Oliveira",             "08/06", "(62)984168862",   "RUA 30, N336, CARRILHO",                                   "005.350.651-08", None,      "KIDS",    "Daiane Suse Souza Oliveira Azevedo"),
    ("Luís Felipe Parreira",               "05/01", "(62)984198262",   "RUA 36 N 515 B:NOVA AURORA",                               "017.227.181-96", None,      "KIDS",    "Rosangela Arreira"),
    ("Heitor Rocha Fernandes",             "06/01", "(62)98165-7110",  "RUA 17, SETOR OESTE, N 254 A",                             "949.999.883-72", None,      "KIDS",    "Maria Cristiane Rocha dos Santos"),
    ("Sara Gomes",                         "06/04", "(62)9983-3669",   "RUA 17, ENTRE 30 E 28, N 276, SETOR OESTE",                "064.363.565-33", None,      "KIDS",    "Bianca Ronice Maria da Rocha"),
    ("Guilherme Henrique Soares Araújo",   "27/04", "(62)98568-6697",  "RUA 11, N 673 A, GRAVILLE",                                "017.018.811-60", None,      "REGULAR", "Gislene de Oliveira Soares Araújo"),
    ("Natália Vieira Lopes",               "25/12", "(62)98594-1239",  "RUA BONIFÁCIO TEODORO SOBRINHO, QD 7, LT 8",               "710.777.271-60", None,      "REGULAR", "Natália Vieira Lopes"),
    ("Veronica Rita de Souza",             "16/09", "(62)985122719",   "RUA 37, NORTE, N315 SANTA LUZIA ENTRE AS RUAS 20 E 22",    "707.439.871-36", None,      None,      None),
    ("Danytza Deine Prudenciano",          "20/03", "(62)98147-9218",  "RUA 01, N:44 BOA VISTA",                                   "71119724147",    None,      None,      None),
    ("Juúlia Pereira Ribeiro",             "06/03", "(62)985499191",   "RUA 14, N:162 SANTA CECILIA",                              "701.855.562-24", None,      None,      None),
    ("Otávio Paiva Belluzzo",              "29/04", "(62)982180386",   "RUA 35, 477 CENTRO",                                       "051.956.616-50", None,      None,      None),
    ("Maria Eduarda Oliveira",             "24/09", "(62)982307698",   "RUA DO YPÊ, N:238, QD 15, LT 15 ALDEIA DO MORRO",          "049.644.331-37", None,      None,      None),
    ("Maria Alice Santos Souza",           "20/02", "(62)99471-5643",  "RUA DAS BROMÉLIAS, N:17 FLAMBOYANT",                       "031.323.811-10", None,      None,      None),
    ("Tatiane Bastos de Souza",            "18/06", "62991222717",     "RUA 27 N 516 SETOR SUL CEP 76382-178",                     "029.264.711-57", None,      None,      None),
    ("Waanndo Rafael Batista Nogueira",    "03/08", "62996847258",     "RUA IPE Q.5 L.1 BAIRRO COVOA",                             "706.520.871-08", None,      None,      None),
    ("Amanda Oliveira Lopes",              "27/10", "(62)9846089398",  "RUA 21 NUMERO 265A",                                       "713.653.321-01", None,      None,      None),
    ("Tálita Lorena Santos",               "30/04", "(62)986030-4139", "RUA 18, N:435, B: POR DO SOL",                             "016.044.111-04", None,      None,      None),
    # VANESSA(PEDRO) e VANESSA(GABRIELA): mesmo CPF após remover parênteses.
    # Primeira entrada cadastrada; segunda ignorada — resolver manualmente.
    ("Vanessa de Almeida Dias",            "26/01", "(62)982245590",   "RUA CEDRO, Q:14, LT:27 PALMEIRAS 3",                       "742.904.281-34", None,      None,      None),
    # ("Vanessa de Almeida Dias",          "24/12", ...) ← IGNORADA (mesmo CPF)
    ("Felipe Alves Londres",               "02/02", "(62)981616378",   "LONDRES",                                                  "871.495.161-49", None,      None,      None),
    # PEDRO FIUZA — sem CPF; Pessoa criada, Aluno pendente
    ("Pedro Fiuza",                        "08/02", None,              None,                                                       None,             None,      None,      None),
    ("Geovanna",                           "14/12", "(62)984433790",   "RUA 14, N:141A, SANTA CECÍLIA",                            "91208343220",    None,      None,      None),
    ("Gean Carlos Rodrigues de Souza",     "16/09", "(62)986273441",   "AV: ALAMEDA ANTÔNIO FONTOURA, Q:12, LT:08 PALMEIRAS 2",    "715.319.641-25", None,      None,      None),
    ("Júlia Kevely Messias de Souza",      "05/07", "(62)986269339",   "PORTUGAL",                                                 "704.423.161-60", None,      None,      None),
    ("Taiana Maria de Souza",              "25/10", "(44)7923404096",  "LONDRES",                                                  "055.876.743-55", None,      None,      None),
    ("Maria Liz",                          "28/11", "(62)985662836",   None,                                                       "040.114.411-98", None,      "KIDS",    None),
    ("Stella Rodrigues",                   "30/10", "(62)9967-6616",   "PRAÇA BOM JESUS",                                          "002.347.151-46", None,      None,      None),
    ("Maria Eduarda Silva Mesquita",       "13/02", "(68)99931-9175",  "TRAVESSA TOME",                                            "008.566.412-00", None,      None,      None),
    ("Thaise Ern",                         "06/03", "(62)98107-1343",  "RUA 13, N:629 GRANVILLE",                                  "706.798.111-50", None,      None,      None),
    ("Jeislie Carolline Trigueiro",        "15/05", "(62)98219-2733",  "RUA 11, N:483 UNIVERSITÁRIO",                              "024.993.881-29", None,      None,      None),
    # DHOVANNA — sem CPF; Pessoa criada, Aluno pendente
    ("Dhovanna",                           "18/06", None,              None,                                                       None,             None,      None,      None),
    ("Raphael Lucas",                      "03/08", "(353)873895119",  "IRLANDA",                                                  "710.457.821-81", None,      None,      None),
    ("Marcus Paulo Araújo",                "21/01", None,              "RUA RIALMA, QD:68, LT:08, GRANVILLE",                      "040.321.381-92", None,      None,      None),
    ("Neliana Rezende Peixoto",            "06/07", None,              "RUA 25, N:354 CENTRO",                                     "007.486.441-64", None,      None,      None),
    ("Daniela Pedrosa Freitas",            "02/04", None,              "RUA BELA VISTA, 10, JARDIM ESPERANÇA 2",                   "701.878.611-88", None,      None,      None),
    ("Igor Honorato Vieira",               "13/11", None,              "RUA 09, ENTRE 12/14 UNIVERSITÁRIO",                        "701.625.861-08", None,      None,      None),
    ("Jhenifer Oliveira Peixoto",          "08/10", None,              "PARQUE DAS PALMEIRAS 1, QD:34, LT:04",                     "708.051.771-08", None,      None,      None),
    ("Gabriel Ferreira Lobo Portugal",     "21/09", None,              "AV: BRASIL, COM A 19, SETOR UNIVERSITÁRIO",                "705.010.201-60", None,      None,      None),
    ("Weslla Maraschin",                   "20/10", None,              "AV: BRASIL, COM A 19, SETOR UNIVERSITÁRIO",                "704.355.181-19", None,      None,      None),
    ("Carlos Henrique Mourato",            "01/11", None,              "ALAMEDA ANTÔNIO FONTOURA, 75, PARQUE PALMEIRA 111",         "707.887.431-29", None,      None,      None),
    ("Lorena Marques Gusmão",              "23/01", None,              "RUA MIRITI, PARQUE PALMEIRAS 1",                           "036.148.191-83", None,      None,      None),
    ("Natã Privat",                        "18/09", None,              "POLONIA",                                                  "502.440.378-92", None,      None,      None),
    # PEDRO AUGUSTO — sem DN
    ("Pedro Augusto",                      None,    None,              None,                                                       "745.507.641-04", None,      None,      None),
    ("Matheus Trajano",                    "22/03", None,              "IRLANDA",                                                  "055.919.063-89", None,      None,      None),
    ("Amanda Gabriele Batista",            "26/07", None,              "AV: MINAS GERAIS N:127 BOUGAVILLE",                        "063.393.081-47", None,      None,      None),
    # AQUILES — sem CPF; Pessoa criada, Aluno pendente
    ("Aquiles Amorim Sposito",             None,    None,              "R: NOSSA SENHORA DO CARMO, N:519 MG",                      None,             None,      None,      None),
]


def clean_cpf(cpf: str) -> str:
    return re.sub(r"[.\-/\s]", "", cpf)


def get_or_create_pessoa(db: Session, nome: str, cpf: str | None, rg: str | None,
                          telefone: str | None, endereco: str | None,
                          menor_de_idade: bool) -> Pessoa:
    cpf_limpo = clean_cpf(cpf) if cpf else None

    # Tenta encontrar pelo CPF primeiro
    if cpf_limpo:
        existente = db.query(Pessoa).filter(Pessoa.cpf == cpf_limpo).first()
        if existente:
            return existente

    pessoa = Pessoa(
        nome=nome,
        cpf=cpf_limpo,
        rg=rg,
        telefone=telefone,
        endereco=endereco,
        menor_de_idade=menor_de_idade,
    )
    db.add(pessoa)
    db.flush()
    return pessoa


def run(db: Session) -> None:
    criados = 0
    pulados = 0
    pendentes_cpf = []

    for (nome_aluno, aniversario, telefone, endereco,
         cpf_resp, rg_resp, curso, nome_responsavel) in DADOS:

        # Determina se é adulto (responsável == aluno ou ausente)
        nome_resp_norm = (nome_responsavel or "").strip().lower()
        nome_aluno_norm = nome_aluno.strip().lower()
        eh_adulto = not nome_responsavel or nome_resp_norm == nome_aluno_norm

        try:
            if eh_adulto:
                # Adulto: CPF do responsável é do próprio aluno
                if not cpf_resp:
                    pessoa = get_or_create_pessoa(db, nome_aluno, None, None,
                                                   telefone, endereco, False)
                    db.flush()
                    pendentes_cpf.append(nome_aluno)
                    print(f"  [PESSOA SEM CPF] {nome_aluno} — Aluno não criado (sem CPF)")
                    continue

                # Verifica se já é aluno
                cpf_limpo = clean_cpf(cpf_resp)
                pessoa_existente = db.query(Pessoa).filter(Pessoa.cpf == cpf_limpo).first()
                if pessoa_existente:
                    aluno_existente = db.query(Aluno).filter(Aluno.pessoa_id == pessoa_existente.id).first()
                    if aluno_existente:
                        print(f"  [PULADO] {nome_aluno} — já cadastrado")
                        pulados += 1
                        continue

                pessoa = get_or_create_pessoa(db, nome_aluno, cpf_resp, rg_resp,
                                               telefone, endereco, False)
                aluno = Aluno(pessoa_id=pessoa.id, status="ativo", aniversario=aniversario)
                db.add(aluno)

            else:
                # Menor: cria/busca responsável com CPF, cria aluno sem CPF
                responsavel = get_or_create_pessoa(db, nome_responsavel, cpf_resp, rg_resp,
                                                    None, None, False)

                pessoa_aluno = get_or_create_pessoa(db, nome_aluno, None, None,
                                                     telefone, endereco, True)
                aluno_existente = db.query(Aluno).filter(Aluno.pessoa_id == pessoa_aluno.id).first()
                if aluno_existente:
                    print(f"  [PULADO] {nome_aluno} — já cadastrado")
                    pulados += 1
                    continue

                aluno = Aluno(
                    pessoa_id=pessoa_aluno.id,
                    status="ativo",
                    aniversario=aniversario,
                    responsavel_id=responsavel.id,
                )
                db.add(aluno)

            db.flush()
            curso_info = f" [{curso}]" if curso else ""
            print(f"  [OK] {nome_aluno}{curso_info}")
            criados += 1

        except Exception as e:
            db.rollback()
            print(f"  [ERRO] {nome_aluno}: {e}")
            return

    db.commit()
    print(f"\n✓ {criados} aluno(s) criado(s), {pulados} já existia(m).")
    if pendentes_cpf:
        print(f"\n⚠ Pendentes (sem CPF — cadastrar manualmente como aluno após adicionar CPF):")
        for nome in pendentes_cpf:
            print(f"  - {nome}")
    print("\n⚠ Lembrete: VANESSA DE ALMEIDA DIAS(GABRIELA) foi ignorada por conflito de CPF.")
    print("  Cadastre a Gabriela manualmente com nome próprio.")


if __name__ == "__main__":
    db: Session = next(get_db())
    try:
        run(db)
    except Exception as e:
        print(f"Erro fatal: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()
