# Desenvolvimento incremental — voz e confiabilidade

- [x] Corrigir cronômetro, reconciliação de estado e conclusão; quatro durações verificadas em Chromium desktop/mobile com relógio acelerado.
- [x] Implementar reprodução PCM incremental, cancelamento único, descarte de áudio obsoleto e fallback MP3; regressões unitárias passaram.
- [x] Implementar transporte isolado Scribe WebSocket com parciais/confirmadas e reconexão testadas; WAV permanece ativo.
- [ ] Integrar captura PCM/token Realtime autenticado e proteção de emissão — bloqueado por ausência de autenticação real no projeto; não há endpoint público de token.
- [x] Separar apresentação paciente/equipe/observador sem modificar o motor; referência com fala autorada e gatilho crítico explícito testados.
- [ ] Completar identidade vocal e falas emocionais nos demais casos — requer autoria e revisão médica dos personagens e gatilhos.
- [x] Proteger negações e doses não modeladas; impedir inferência emocional e envio de sinais não medidos ao modelo.
- [x] Adicionar conversa acessível e preservar estrutura/tamanho da interface aprovada.
- [x] Executar 25 regressões e oito percursos de duração; compilação/verificação de tipos automática sem erros.
- [ ] Homologar áudio real por 15/30 minutos, barge-in acústico e Safari iOS — requer dispositivo/microfone real; relógio acelerado não equivale a teste contínuo.