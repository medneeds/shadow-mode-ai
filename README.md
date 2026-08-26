# Shadow Medical Training

SHADOW MODE — FOUNDATION / PRODUCT SHELL / DESIGN SYSTEM

STATUS

EXECUTE NOW.

This is PHASE 01 of a multi-phase product development process.

Do NOT attempt to build the entire Shadow Mode platform in this prompt.

The goal of this first phase is to establish:

the product foundation;

visual identity;

design system;

application shell;

primary navigation;

responsive behavior;

initial page structure;

reusable UI components;

the visual foundation for the future voice simulation experience.

Future prompts will progressively implement authentication, simulation configuration, the Shadow voice room, ElevenLabs integration, clinical case logic, scoring, history, analytics, and other production features.



1. PRODUCT

Product name:

Shadow Mode

Shadow Mode is an AI-powered medical training platform based on realistic, voice-first clinical simulation.

The core future experience will work like this:

Choose training → Configure station → Enter Shadow Mode → Talk naturally → Manage the clinical case → Receive structured feedback and score

The AI behaves as a clinical simulation trainer.

Example:

“A 58-year-old patient is brought to the emergency department unconscious by family members. You may begin your assessment.”

The user then conducts the case verbally.

The simulation will eventually evaluate:

initial approach;

stabilization priorities;

history taking;

physical examination;

diagnostic reasoning;

differential diagnoses;

complementary tests;

interpretation of findings;

treatment;

medications;

procedures;

specialist consultation;

disposition;

definitive management;

prioritization;

clinical safety;

communication;

time management.

This context is provided so that the UI architecture created now is compatible with the future product.

Do not implement the clinical engine in this phase.



2. TARGET USERS

Shadow Mode has three training levels.

BASIC

Target:

Medical students.

Focus:

clinical reasoning foundations;

structured patient assessment;

history;

physical examination;

basic diagnosis and management.

INTERMEDIATE

Target:

Physicians and residents.

Focus:

realistic clinical decision-making;

emergency medicine;

inpatient medicine;

critical care;

prioritization;

practical management.

ADVANCED

Target:

Physicians preparing for specialist board examinations and advanced clinical assessments.

Focus:

difficult cases;

subtle diagnostic clues;

high-pressure decision-making;

advanced clinical reasoning;

board-style evaluation.

Do not implement the training engine yet.

These levels only need to influence the information architecture and future-ready component structure.



3. LANGUAGE — CRITICAL REQUIREMENT

The technical prompt is intentionally written in English.

However:

THE ENTIRE USER-FACING PRODUCT MUST BE IN BRAZILIAN PORTUGUESE (pt-BR).

This includes:

navigation;

buttons;

labels;

headings;

descriptions;

onboarding;

forms;

placeholders;

empty states;

loading states;

feedback;

warnings;

errors;

simulation UI;

clinical content;

scoring interfaces;

settings;

profile;

accessibility labels.

Never expose English interface copy to the end user.

Technical implementation may remain in English:

variable names;

function names;

component names;

file names;

code comments;

internal documentation;

technical types.

Example:

Component:

SimulationSetupCard

User-facing title:

Configurar estação

NOT:

“Configure Station”



4. PRODUCT EXPERIENCE

Shadow Mode must NOT feel like:

a hospital EMR;

an administrative healthcare dashboard;

a generic SaaS;

a medical records platform;

an online course marketplace;

a conventional LMS;

a collection of disconnected cards.

It should feel like:

a premium AI clinical training environment.

Think:

focused;

intelligent;

immersive;

calm;

precise;

modern;

premium;

highly intentional.

The interface should disappear when the simulation starts.

The clinical conversation must eventually become the center of the experience.



5. CORE UX PRINCIPLE

The product should progressively move the user toward one central action:

TREINAR

The application should communicate:

“Escolha um cenário. Entre no Modo Sombra. Conduza o caso.”

Avoid unnecessary complexity.

Do not overwhelm users with analytics, configuration panels, or dashboards before they start training.



6. VISUAL DIRECTION

Create an original premium visual identity.

Primary visual language:

Deep Navy

Use as the main structural color.

Examples:

application background;

navigation;

dark surfaces;

immersive simulation environment.

Approximate direction:

#071521

or a refined equivalent.

Moss Green

Use as a secondary identity color.

Approximate direction:

#586B52

or a refined equivalent.

Use for:

active states;

progress;

selected elements;

subtle clinical accents.

Muted Gold

Use sparingly.

Approximate direction:

#B89A5B

or a refined equivalent.

Use for:

premium details;

important highlights;

advanced level indicators;

subtle borders;

achievements;

selected emphasis.

Gold must NEVER dominate the interface.

Avoid bright yellow.

Neutral palette

Use:

off-white;

warm gray;

charcoal;

subtle navy-gray surfaces.

Avoid pure white everywhere.



7. DESIGN SYSTEM

Use Tailwind CSS as the styling foundation.

Create reusable design tokens for:

colors;

spacing;

typography;

borders;

radii;

shadows;

surfaces;

focus states;

interactive states.

Do not scatter arbitrary colors throughout components.

Centralize the visual language.

The UI should have generous spacing.

Avoid excessive borders.

Prefer hierarchy through:

spacing;

typography;

surface contrast;

subtle elevation.



8. TYPOGRAPHY

Typography should feel:

clinical;

sophisticated;

highly readable;

modern.

Use strong hierarchy.

Large headings should be confident but restrained.

Body text must prioritize readability.

Avoid overly futuristic typography.

Avoid excessive uppercase.



9. COMPONENT PHILOSOPHY

Components should feel purposeful.

Avoid the common AI-generated UI problem of placing every piece of information inside a rounded card.

Use cards only when they represent a meaningful interactive object.

Prefer:

whitespace;

clear sections;

typography;

subtle separators;

structured surfaces.

Buttons should have clear hierarchy:

Primary

Main action.

Example:

Iniciar treinamento

Secondary

Supporting action.

Ghost

Low-priority navigation/action.



10. APPLICATION STRUCTURE

Prepare the application shell for these future areas:

Início

Primary training entry point.

Treinar

Future simulation configuration.

Histórico

Future completed simulation history.

Desempenho

Future progress and performance analytics.

Perfil

User preferences and account information.

Do NOT fully implement these systems now.

Create the navigation architecture and appropriate placeholder page structures only.



11. HOME EXPERIENCE

Build the first meaningful home experience.

The Home page should immediately answer:

Where am I?

What can I do?

How do I start training?

The primary hero should communicate the value of Shadow Mode.

Suggested pt-BR copy direction:

Treine decisões clínicas. Não respostas decoradas.

Supporting text:

Entre em cenários clínicos por voz, conduza o atendimento e descubra como você realmente decide sob pressão.

Primary CTA:

Iniciar treinamento

Secondary CTA:

Ver histórico

Do not overcrowd the hero.



12. TRAINING ENTRY

Create a visual preview of the future training configuration experience.

The future configuration will allow users to select:

Tema

Examples:

Emergência

Cardiologia

Neurologia

Infectologia

Pneumologia

Terapia Intensiva

Clínica Médica

Pediatria

Cirurgia

These are examples only.

Nível

Básico

Intermediário

Avançado

Duração da estação

3 minutos

5 minutos

15 minutos

30 minutos

For this phase, this can be UI-only.

No real case generation is required.



13. SHADOW ROOM — VISUAL PROTOTYPE ONLY

Create the visual foundation for the most important future screen:

Modo Sombra

Do not implement real voice AI yet.

The room should feel significantly more immersive than the rest of the application.

Reduce navigation distractions.

The user should feel:

“The simulation has started.”

The center of the experience should contain a voice presence visualization.

Conceptually:

            MODO SOMBRA



          [ voice presence ]



           Ouvindo...



    ─────────────────────



    04:18 restantes

The visualization should be elegant and restrained.

Possible visual behaviors for future implementation:

breathing animation;

subtle waveform;

reactive halo;

listening state;

thinking state;

speaking state.

Do NOT create a cartoon avatar.

Do NOT create a humanoid AI.

Shadow should feel like an intelligent presence, not a character.



14. FUTURE VOICE STATES

Prepare components to visually support these future states:

idle

listening

processing

speaking

paused

finished

For now, mock these states visually where useful.

Do not integrate a real voice provider in Phase 01.



15. ELEVENLABS — FUTURE INTEGRATION

Shadow Mode will use ElevenLabs for real-time voice interaction.

Future phases will implement:

speech recognition;

voice activity detection;

streaming transcription;

AI response;

streamed speech synthesis;

interruption handling;

natural turn-taking;

microphone state;

latency handling;

audio permissions;

connection recovery.

Do NOT implement ElevenLabs in this phase.

Only make sure the UI architecture can accommodate these states later.



16. FUTURE CLINICAL SIMULATION MODEL

The future simulation engine must support a hidden structured case containing expected clinical actions.

Possible categories:

abordagem inicial;

segurança;

ABCDE;

anamnese;

exame físico;

hipóteses diagnósticas;

diagnóstico diferencial;

exames laboratoriais;

exames de imagem;

monitorização;

tratamento inicial;

medicações;

procedimentos;

consultas especializadas;

reavaliação;

destino;

tratamento definitivo.

The user should never see this checklist during an active station.

The simulation engine will compare the user’s actions against expected actions.

Do NOT implement this engine now.



17. FUTURE SCORING EXPERIENCE

The future score should not simply display:

“73/100”

It should teach.

Prepare the design language for a future post-simulation screen containing:

Nota geral

Abordagem inicial

Raciocínio diagnóstico

Exame físico

Exames complementares

Tratamento

Priorização

Segurança

And sections such as:

Você fez bem

Você deixou passar

Pontos críticos

Como melhorar

Conduta esperada

Linha do tempo da estação

Do not implement scoring logic now.

A static visual prototype is acceptable if necessary to establish the design system.



18. RESPONSIVENESS

The platform must work beautifully on:

desktop;

laptop;

tablet;

mobile.

Desktop should provide maximum immersion.

Mobile must remain fully usable.

The Shadow Room is particularly important on mobile.

Avoid simply shrinking desktop layouts.

Create intentional responsive behavior.



19. ACCESSIBILITY

Build accessibility into the foundation.

Include:

semantic HTML;

keyboard navigation;

visible focus states;

accessible contrast;

button labels;

microphone state accessibility;

reduced-motion considerations;

screen-reader-friendly structure.



20. MOTION

Motion should be subtle.

Use animation primarily for:

Shadow voice presence;

state transitions;

page transitions;

selected states;

progress.

Avoid decorative animation.

Avoid excessive floating elements.

Avoid visual noise.

The interface should feel alive without feeling animated for its own sake.



21. DO NOT BUILD IN PHASE 01

Do NOT implement:

production authentication;

production database;

real AI clinical reasoning;

real case generation;

real scoring engine;

ElevenLabs API integration;

real speech-to-text;

real text-to-speech;

patient database;

clinical records;

payment;

subscriptions;

admin CMS;

multiplayer;

social features;

leaderboards;

gamification systems;

complex analytics;

unnecessary dependencies.

Do not fake production functionality.

Mock data is acceptable for establishing the experience.



22. ARCHITECTURE

Keep the codebase modular and ready for future phases.

Prefer clear separation between:

app shell;

navigation;

design system;

training setup;

simulation room;

voice UI;

results;

user profile.

Do not over-engineer.

Do not create abstractions without an immediate purpose.

Do not install dependencies “for later.”



23. PHASE 01 DELIVERABLE

At the end of this prompt, I expect a polished clickable product foundation containing:

1. Global design system

2. Responsive application shell

3. Navigation

4. Home

5. Training configuration UI prototype

6. Shadow Room visual prototype

7. Results visual language / lightweight prototype

8. Reusable UI primitives

The product should already visually communicate what Shadow Mode is even though the real intelligence and voice systems are not implemented yet.



24. QUALITY BAR

Do not produce a generic dashboard.

Do not produce a template-looking medical SaaS.

Do not fill the interface with cards simply to occupy space.

Do not use excessive gradients.

Do not use excessive glassmorphism.

Do not use neon colors.

Do not use stereotypical medical imagery.

Do not use stock photos of doctors.

Do not use giant medical crosses, ECG lines, stethoscopes, or cliché healthcare illustrations as decorative elements.

The identity should come from:

typography;

proportion;

spacing;

interaction;

color;

voice presence;

clinical precision.

Every visual element must have a reason to exist.



25. NORTH STAR

The entire product should eventually make this experience feel effortless:

ESCOLHER TREINO

↓

CONFIGURAR ESTAÇÃO

↓

ENTRAR NO MODO SOMBRA

↓

CONVERSAR NATURALMENTE

↓

CONDUZIR O CASO

↓

RECEBER FEEDBACK

↓

ENTENDER ONDE MELHORAR

The user should feel like they are entering a clinical training room, not opening another study app.



FINAL INSTRUCTION

Implement PHASE 01 only.

Prioritize the visual foundation, UX architecture, responsiveness, component quality, and the Shadow Mode identity.

All user-facing content must be Brazilian Portuguese (pt-BR).

Do not anticipate future implementation phases.

Do not implement ElevenLabs yet.

Do not implement the clinical simulation engine yet.

Do not implement production authentication yet.

Do not implement real scoring yet.

Build a foundation strong enough that these systems can be added progressively in subsequent prompts without redesigning the core experience.

When Phase 01 is complete, stop and report:

what was implemented;

main files/components created;

routes created;

responsive behavior implemented;

mocked functionality;

anything intentionally deferred;

technical validation performed.

Then wait for the next prompt.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://shadow-mode-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b87bea07-0c8e-43dc-9d96-2a295ecfdf17).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
