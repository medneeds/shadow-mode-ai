# Validação incremental — 10/11/2026

## Preservado
Motor clínico determinístico, regras de transição, pontuação e integração Lovable. Nenhum comando Git de alteração de histórico foi usado. A camada de apresentação não modifica fisiologia.

## Implementado
- Cronômetro monotônico com recuperação após suspensão de timers; conclusão captura runtime atualizado.
- Ações interpretadas tardiamente são reaplicadas ao estado atual, sem retroceder tempo ou deterioração; fala usa os eventos da reaplicação, não fatos obsoletos.
- Reprodução PCM mono 24 kHz em blocos ordenados, controle de fila, cancelamento compartilhado de fetch/fontes/timers/Promise, descarte de turno antigo e fallback MP3. Contexto de áudio pode ser desbloqueado por gesto.
- Captura WAV mantida, sem captura duplicada durante permissão pendente e com descarte após desmontagem; push-to-talk limitado a 20 segundos.
- Transporte Scribe v2 Realtime isolado, token injetável, parciais exclusivamente visuais e reconexão com token novo; **não integrado à captura nem habilitado**.
- Paciente/equipe/Sombra separados na apresentação; caso de referência contém uma fala autorizada e um gatilho crítico autorado. Paciente inconsciente não fala. Demais casos comunicam fatos pela equipe até terem autoria própria.
- Respostas clínicas exibem exclusivamente fatos do motor. Sombra não responde espontaneamente a conteúdo relacional durante a estação.
- Sinais não medidos e glicemia oculta excluídos do contexto do modelo. Negação ambígua não executa ação; doses específicas não modeladas são explicitamente recusadas, não convertidas silenciosamente em tratamento genérico.
- Interpretação usa SDK oficial com modelo existente preservado, validação estruturada e limite de espera. Em falha não há replay automático de condutas.
- Conversa acessível, controles preservados, metadados próprios nas páginas e instrumentos de tempo para STT/TTS/primeira reprodução; p50/p95 e monitoramento persistente ainda não implementados.

## Evidências executadas
- `bunx vitest run --config vitest.config.ts`: **25 testes passaram em 8 arquivos**.
- Regressões: pré-requisitos, informações ocultas, exames repetidos, determinismo, quatro durações, pausa, timer suspenso, reconciliação tardia, cancelamento idempotente, PCM com chunks ímpares, parciais/confirmadas, reconexão, token obsoleto, papéis, doses/negações e timeout.
- Playwright Chromium: **8 percursos passaram**, 3/5/15/30 minutos em 1280×1800 e 390×844, incluindo pausa, retomada e resultado, com relógio acelerado e sem page errors. Scripts mantidos em `tests/e2e/`.
- Entrada digitada foi preservada no resultado; uma execução com `dextro` no caso de hipoglicemia devolveu solicitação factual de glicemia pela equipe. Isso não valida STT nem interpretação de todas as condutas.
- Diagnóstico automático do Lovable: última entrada verificada `build OK`, incluindo verificação de tipos. Não foi executado build/typecheck manual paralelo ao harness.

## Pendências e dependências
1. Autenticação real de usuários, consentimento e proteção de emissão são pré-requisitos para endpoint de token efêmero. Não há endpoint público inseguro nem token emitido nesta rodada.
2. `ELEVENLABS_API_KEY` já existe pela conexão ElevenLabs; nenhuma chave nova foi solicitada/exposta. Disponibilidade da chave não comprova quota, permissões Realtime ou autorização de vozes distintas.
3. O transporte Realtime precisa receber captura PCM 16 kHz e ser conectado à UI somente após autenticação; o fallback WAV é o fluxo efetivo atual.
4. MP3 fallback e PCM incremental requerem teste de áudio real no Safari iOS. Em bloqueio de autoplay a resposta permanece em texto; não se promete reprodução automática no Safari.
5. Barge-in acústico, STT real, continuidade por 15/30 minutos e prosódia por personagem não foram homologados. Testes com relógio acelerado e mocks de WebSocket não equivalem a sessões reais com microfone.
6. Dose, via e farmacologia precisam de contratos clínicos autorados/revisados antes de avaliação dose-dependente. Não foi inventada uma tabela de doses.
7. Restam autoria e revisão médica de fala/identidade/gatilhos críticos para os outros casos, métricas p50/p95 persistentes e limites de uso autenticados.