# Shadow como "Jarvis clínico": inteligência relacional, onboarding do médico e microfone evidente

Cinco frentes. Nada disso afrouxa a política de não-dica nem deixa o LLM inventar verdade clínica.

## 1. Inteligência relacional (não só clínica)

Hoje o interpretador só classifica em: configuração, meta comando, clínico, ambíguo. Perguntas como "você está me compreendendo?", desabafos, frustração ou fala fora do eixo caem em "ambíguo" e viram uma pergunta seca.

- Nova classe `relational` no interpretador, com sinais adicionais: `emotionalTone` (neutro, tenso, frustrado, disperso, confiante) e `offTrack` (booleano).
- Nova rota no Trainer Engine: resposta relacional curta, no tom do perfil configurado, que reconhece a pessoa e devolve o eixo — sem citar conduta, exame, diagnóstico ou passo omitido.
  - Brando: acolhe e devolve o eixo com calma.
  - Incisivo: reconhece em uma frase e recoloca a pressão.
  - Acelerado: uma frase, relógio andando.
  - Permissivo: abre espaço, depois devolve o eixo.
- Regra dura mantida: resposta relacional nunca gera ação clínica, nunca pontua, nunca altera o estado do paciente.
- Anti-alucinação reforçado: qualquer pergunta factual sobre o paciente continua indo pelo motor determinístico; se o fato não existe no caso, o Sombra diz que não há esse dado — não inventa.

## 2. Início rápido (nomenclatura: "Estações rápidas")

Na `/treinar`, acima do campo de conversa: 3 a 4 cartões de um toque que preenchem tema + nível + tempo e entram direto na estação. Exemplos: "Emergência · 10 min", "Raciocínio rápido · 15 min", "Repetir última estação", "Surpreenda-me". Os chips atuais continuam para ajuste fino.

## 3. Microfone visível ao lado do compositor

O gesto de dois toques na esfera continua, mas deixa de ser a única porta.

- Botão de microfone dedicado colado ao campo de texto, na `/treinar` e na sala, com estado visual (desligado / ouvindo) e rótulo acessível.
- Dica discreta de primeira vez ("Toque no microfone ou dê dois toques na esfera"), exibida uma vez e depois silenciada.

## 4. Primeiro acesso: perfil do médico (onboarding conversacional)

Fluxo curto e conversacional no primeiro acesso — nunca formulário longo, uma pergunta por vez, sempre pulável.

Perguntas: momento de formação e proficiência; como lida com estresse agudo; habilidades já sólidas; conforto com escassez de recursos; conforto com raciocínio rápido; expectativa com a SMT; voz do Shadow (feminina ou masculina, com prévia falada); tom de interação preferido (mapeia para o perfil de treinador).

- Persistido localmente (`localStorage`) como `DoctorProfile` — sem backend nesta etapa.
- Alimenta os padrões de configuração e o tom do Sombra em todas as estações; editável depois em `/perfil`.
- O perfil influencia linguagem, pressão e calibração de ritmo. Nunca influencia a verdade clínica nem a pontuação.

## 5. Personalização contínua

O ritmo de fala já se autocalibra. Somamos: preferências de voz/tom aplicadas automaticamente em novas estações e reconhecidas por fala ("fala mais devagar", "quero voz masculina", "pega mais leve") via meta comandos que já existem.

## Detalhes técnicos

- `interpretation-schema.ts`: adicionar `kind: "relational"`, `emotionalTone`, `offTrack` ao schema Zod e ao JSON Schema estrito.
- `interpret.server.ts`: regras da fase ativa e pré-estação reconhecendo fala relacional; catálogo de ações segue como enum fechado.
- `trainer-engine.server.ts`: modo relacional com política de não-dica reforçada.
- `shadow.functions.ts`: novo ramo `relational`, fora do motor clínico e fora da pontuação.
- Novos: `src/lib/profile/doctor-profile.ts` (tipos + persistência), `src/components/shadow/OnboardingFlow.tsx`, `src/components/shadow/QuickStations.tsx`, `src/components/shadow/ComposerMic.tsx`.
- Editados: `treinar.tsx`, `modo-sombra.tsx`, `perfil.tsx`, `shadow-trainer.ts`.
