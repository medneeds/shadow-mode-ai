# Modo Sombra — QA manual pré-usuário

Execute em desktop e, quando disponível, em viewport de aproximadamente 390 px.

## Matriz

- [ ] Texto e voz: desktop; texto e voz: viewport móvel.
- [ ] Duração: 3, 5, 15 e 30 minutos; confira respectivamente 03:00, 05:00, 15:00 e 30:00 no início.
- [ ] Nível: Básico mostra 3 opções contextuais; Intermediário mostra até 5 e nenhuma em zona livre; Avançado não mostra opções.
- [ ] Configuração: início manual, Quick Station, conversa e configuração + início na mesma frase; altere nível, tema, perfil e voz antes de iniciar.
- [ ] Voz: feminina, masculina, saída silenciada, falha de áudio com resposta textual preservada.
- [ ] Entrada: voz, texto, híbrido, falha de reconhecimento com texto disponível; toque/Enter repetidos não devem gerar dois turnos.
- [ ] Sessão: iniciar, pausar, retomar repetidamente, encerrar e aguardar término automático; relógio e tempo clínico não aceleram.
- [ ] Falhas: simule falha de turno e use “Tentar novamente”; confirme que a mesma entrada aparece uma vez.
- [ ] Navegação: atualize a estação, volte à configuração e abra resultado sem sessão concluída; não deve haver dados clínicos fabricados.
- [ ] Mobile: presença, relógio, opções e composer seguem visíveis, sem rolagem horizontal; teclado não impede enviar.
- [ ] Acessibilidade: Tab alcança controles, Enter envia texto, estados desabilitados são anunciados e diálogo de encerramento mantém foco.

Em desenvolvimento, acrescente `?qa=1` à rota `/modo-sombra` para conferir caso, duração, runtime, guia, disponibilidade de voz e turno atual.
