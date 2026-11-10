# Auditoria técnica — Modo Sombra (10/11/2026)

## Escopo verificado
Inspeção estática dos arquivos de voz, motor clínico, treinador, endpoints e package.json. Não equivale a auditoria integral, execução de testes, validação de infraestrutura ou homologação clínica.

## Achados confirmados
1. **P1 — promessa de reprodução pendente após interrupção.** `use-shadow-speech.ts` cancelava áudio e removia callbacks sem resolver a Promise retornada por `speak`. Corrigido com resolvedor idempotente, chamado no cancelamento e desmontagem. Requer teste de regressão no navegador.
2. **P1 — STT não é realmente streaming.** `/api/voice/transcribe` recebe arquivo WAV completo e retorna somente texto final. Migrar progressivamente para Scribe v2 Realtime/WebSocket com token efêmero emitido pelo servidor, VAD e transcrições parciais/confirmadas; manter fallback atual.
3. **P1 — TTS perde vantagem do streaming.** `voice-transport.ts` usa `response.blob()` antes de reproduzir. Avaliar player incremental com cancelamento e fila ordenada de áudio; medir tempo até primeiro áudio audível no iOS Safari.
4. **P1 — ausência de garantia de avaliação end-to-end.** `package.json` não expõe scripts de teste ou typecheck. Adicionar `typecheck`, testes unitários do motor e testes E2E de sessões 3/5/15/30 minutos antes de declarar confiabilidade.
5. **P1 — integridade clínica.** Preservar motor determinístico como fonte exclusiva de verdade, com ações esperadas e desfechos definidos por caso. Adicionar testes de não vazamento do diagnóstico, contraindicações, omissões críticas e coerência de sinais vitais.
6. **P2 — emoção e papéis.** Separar identidade vocal do paciente, voz do treinador Sombra e comunicação da equipe; garantir concordância de voz/gênero quando aplicável. Prosódia, hesitações e ansiedade não devem modificar fatos clínicos nem pontuação.
7. **P2 — observabilidade e privacidade.** Medir latência STT/LLM/TTS, turnos interrompidos, falhas e divergência entre transcrição e intenção clínica; não registrar áudio identificável por padrão. Rever autenticação, limites, consentimento e retenção.

## Arquitetura-alvo
Microfone -> streaming STT/VAD -> intérprete de intenções clínicas -> motor determinístico -> camada de apresentação (paciente/equipe/Sombra) -> TTS incremental -> áudio e texto sincronizados.

O treinador deve atuar como observador e fonte de informações clínicas autorizadas, não como paciente. Durante a estação, só interromper por gatilho de risco previamente definido; debriefing estruturado após encerramento.

## Critérios de aceite
- Sem promises pendentes ao interromper áudio, trocar turno ou desmontar componente.
- Interrupção da fala com resposta a nova entrada, sem áudio de turno antigo.
- Transcrição parcial e final, com correção de erros de terminologia médica.
- Casos idênticos com mesma sequência de ações e tempo produzem o mesmo desfecho clínico.
- Nenhuma informação oculta vaza antes da ação/pergunta necessária.
- Sessões de 15 e 30 minutos sem travamento em iOS Safari e desktop.
- Relatório por domínios clínicos, com evidência da fala/ação que sustenta cada nota.

## Próximas etapas
1. Adicionar harness de testes e CI.
2. Implementar STT realtime com fallback.
3. Implementar TTS incremental e cancelamento testado.
4. Revisar intérprete, transições de estado e escalonamento do treinador.
5. Executar matriz E2E mobile/desktop e validar casos com revisão médica.

**Estado:** auditoria parcial documentada; nenhuma homologação ou teste automatizado foi executado nesta revisão.
