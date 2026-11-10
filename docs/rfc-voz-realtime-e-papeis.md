# RFC — Conversação clínica em tempo real (proposta de implementação)

Status: **proposta técnica, não implementada**. Não confundir este documento com funcionalidade entregue.

## Papéis
- **Paciente virtual**: fala em primeira pessoa, mantém identidade, idade, sexo e voz coerentes, expressa sintomas e emoções conforme o estado clínico definido.
- **Equipe assistencial**: comunica dados objetivos, sinais vitais, resultados e execução de ordens quando disponíveis.
- **Treinador Sombra**: observador distinto do paciente; não antecipa diagnóstico nem ações esperadas. Interrompe apenas diante de gatilhos críticos explicitamente configurados; conduz o debriefing depois.

## Pipeline recomendado
1. Microfone com permissão explícita, cancelamento de eco, supressão de ruído e detecção de voz.
2. STT realtime com transcrições parciais somente para exibição; **apenas transcrições confirmadas** acionam o interpretador. Fallback: WAV completo e endpoint atual.
3. Intérprete extrai intenção clínica, negações, dose, via, tempo, ação, paciente-alvo e grau de certeza. Termos ambíguos devem solicitar confirmação, não executar tratamento.
4. Motor clínico determinístico valida pré-requisitos, disponibilidade de informações, progressão temporal e consequências; não recebe controle de fatos clínicos do LLM.
5. Gerador de fala recebe somente fatos autorizados e o papel da resposta; mantém um único texto canônico para áudio e tela.
6. TTS com reprodução incremental e cancelamento idempotente; descartar respostas de turnos obsoletos.
7. Avaliação pós-estação com trilha de evidências (fala reconhecida, intenção, ação efetivada, horário e resultado).

## STT realtime — requisitos
- API ElevenLabs Scribe v2 Realtime por WebSocket, usando **token de uso único emitido por backend autenticado**; jamais enviar a API key ao cliente.
- Endpoint de token deve exigir sessão autenticada, validação de origem, limites por usuário e proteção contra abuso; não habilitar endpoint público antes disso.
- Não gerar tokens antecipadamente; renovar somente ao iniciar/reconectar.
- Sessões de 15 e 30 minutos devem lidar com expiração do token e reconexão sem perder histórico confirmado.
- Medir tempo até parcial, até confirmação, erro de transcrição de terminologia clínica e interrupções.
- Política explícita de consentimento, retenção de áudio e minimização de dados.

## TTS — requisitos
- Evitar aguardar download completo de MP3 antes do início da reprodução.
- Selecionar player incremental compatível com Safari iOS, com fallback confiável.
- Garantir que cancelamento interrompe fetch, reprodução, fila e Promise.
- Voz de paciente não deve ser confundida com voz do treinador; preservar gênero e identidade quando aplicável.
- Emoção controla prosódia e ritmo, não altera sinais vitais, histórico ou diagnóstico.

## Plano de validação
- Unitários: pré-requisitos, informações ocultas, ações equivalentes, gatilhos, resultados, pontuação.
- Integração: STT parcial/final, falha e reconexão, interrupção de TTS, áudio antigo, fallback.
- E2E: estações de 3, 5, 15 e 30 minutos em desktop Chrome e Safari iOS; alternância voz/texto; interrupções e pausas.
- Revisão médica: casos críticos e contraindicações, cegamento de diagnóstico, coerência de condutas e debriefing.
- Instrumentação: p50/p95 de latência por etapa, taxa de falhas, travamentos e divergências de transcrição.

## Entregas verificadas nesta rodada
- Correção do cancelamento de Promise e corrida de reprodução de voz.
- Correção de ações inválidas e repetição de exames no motor clínico.
- Testes unitários adicionados e comandos de teste/typecheck declarados.
- **Não foram executados** testes, builds, CI ou validação em navegador. Realtime STT e player incremental ainda não implementados.
