export const nr23Module = {
  id: "nr23",
  title: "Brigada Industrial",
  shortTitle: "Brigada",
  theme: "fire",
  source: "docs/Brigada Industrial correta.pdf",
  activities: [
    {
      id: "word-search",
      type: "word-search",
      title: "Caça-palavras competitivo",
      subtitle: "Primeira equipe a encontrar cada palavra conquista 10 pontos.",
      points: 10,
      hint: "Procure termos ligados a fogo, abandono, equipamentos e métodos de extinção.",
      words: [
        { id: "brigada", term: "BRIGADA", clue: "Grupo organizado e capacitado para emergências." },
        { id: "extintor", term: "EXTINTOR", clue: "Equipamento portátil de combate ao princípio de incêndio." },
        { id: "hidrante", term: "HIDRANTE", clue: "Tomada de água para conexão de mangueiras." },
        { id: "alarme", term: "ALARME", clue: "Dispositivo de aviso em emergência." },
        { id: "abandono", term: "ABANDONO", clue: "Saída organizada da área de risco." },
        { id: "evacuacao", term: "EVACUACAO", clue: "Procedimento seguro para deixar o local." },
        { id: "combustivel", term: "COMBUSTIVEL", clue: "Substância capaz de queimar e alimentar a combustão." },
        { id: "comburente", term: "COMBURENTE", clue: "Agente oxidante, normalmente o oxigênio do ar." },
        { id: "calor", term: "CALOR", clue: "Energia que inicia a combustão." },
        { id: "mangueira", term: "MANGUEIRA", clue: "Equipamento conectado ao hidrante para conduzir água." },
        { id: "prevencao", term: "PREVENCAO", clue: "Ação para reduzir riscos antes da emergência." },
        { id: "isolamento", term: "ISOLAMENTO", clue: "Método que separa combustível e fonte de energia." },
        { id: "resfriamento", term: "RESFRIAMENTO", clue: "Método que reduz a temperatura do combustível." },
        { id: "abafamento", term: "ABAFAMENTO", clue: "Método que reduz contato com oxigênio." }
      ]
    },
    {
      id: "crossword",
      type: "crossword",
      title: "Cruzadinha competitiva",
      subtitle: "Cada resposta correta pode ser conquistada por uma única equipe.",
      points: 15,
      hint: "As respostas usam letras sem acento.",
      rows: 16,
      cols: 16,
      entries: [
        { id: "combustivel", number: 1, row: 0, col: 0, direction: "across", answer: "COMBUSTIVEL", clue: "Elemento do fogo que fornece energia para a queima." },
        { id: "calor", number: 2, row: 0, col: 0, direction: "down", answer: "CALOR", clue: "Energia que eleva a temperatura e inicia a ignição." },
        { id: "oxigenio", number: 3, row: 0, col: 1, direction: "down", answer: "OXIGENIO", clue: "Componente do ar que atua como comburente." },
        { id: "espuma", number: 4, row: 0, col: 9, direction: "down", answer: "ESPUMA", clue: "Agente que forma camada de proteção e ajuda no abafamento." },
        { id: "extintor", number: 5, row: 2, col: 2, direction: "across", answer: "EXTINTOR", clue: "Deve estar visível, sinalizado, desobstruído e dentro da validade." },
        { id: "hidrante", number: 6, row: 4, col: 0, direction: "across", answer: "HIDRANTE", clue: "Ponto onde se conectam mangueiras para combate ao fogo." },
        { id: "alarme", number: 7, row: 6, col: 4, direction: "across", answer: "ALARME", clue: "Deve ser acionado em uma emergência." },
        { id: "abandono", number: 8, row: 8, col: 0, direction: "across", answer: "ABANDONO", clue: "Procedimento de saída da área com segurança." },
        { id: "rotafuga", number: 9, row: 8, col: 7, direction: "down", answer: "ROTAFUGA", clue: "Caminho definido para sair do local de risco." },
        { id: "evacuacao", number: 10, row: 10, col: 4, direction: "across", answer: "EVACUACAO", clue: "Deixar o ambiente de forma rápida e segura." },
        { id: "isolamento", number: 11, row: 3, col: 13, direction: "down", answer: "ISOLAMENTO", clue: "Método que separa o combustível do calor ou do ambiente incendiado." },
        { id: "resfriar", number: 12, row: 13, col: 1, direction: "across", answer: "RESFRIAR", clue: "Ação de reduzir a temperatura abaixo do ponto de fulgor." }
      ]
    },
    {
      id: "true-false",
      type: "true-false",
      title: "Verdadeiro ou falso",
      subtitle: "Uma tentativa por afirmação.",
      points: 10,
      hint: "Leia a explicação após cada resposta.",
      questions: [
        { id: "vf-01", statement: "A NR 23 exige informações aos trabalhadores sobre equipamentos de combate ao incêndio.", answer: true, explanation: "O PDF cita a obrigação de informar sobre uso dos equipamentos de combate ao incêndio." },
        { id: "vf-02", statement: "Saídas de emergência podem ficar trancadas durante a jornada se todos souberem onde está a chave.", answer: false, explanation: "A NR 23 citada no PDF informa que nenhuma saída de emergência deve ser fechada à chave ou presa durante a jornada." },
        { id: "vf-03", statement: "O triângulo do fogo reúne combustível, comburente e calor.", answer: true, explanation: "O material apresenta combustível, oxigênio do ar e temperatura de ignição como elementos da combustão." },
        { id: "vf-04", statement: "A reação em cadeia transforma o triângulo em tetraedro do fogo.", answer: true, explanation: "O PDF acrescenta a reação em cadeia ao triângulo, formando o tetraedro do fogo." },
        { id: "vf-05", statement: "Condução é transferência de calor por ondas através do espaço.", answer: false, explanation: "Essa definição é de irradiação; condução ocorre através de um corpo sólido, de molécula a molécula." },
        { id: "vf-06", statement: "Convecção envolve movimento de massas de gases ou líquidos.", answer: true, explanation: "O PDF descreve convecção como transferência pelo movimento ascendente de gases ou líquidos." },
        { id: "vf-07", statement: "Classe C envolve equipamentos elétricos energizados.", answer: true, explanation: "A classe C é apresentada para motores, transformadores, quadros de distribuição e fios energizados." },
        { id: "vf-08", statement: "Água age principalmente por resfriamento.", answer: true, explanation: "O agente água é descrito como abundante e atuante principalmente por resfriamento." },
        { id: "vf-09", statement: "Pó químico comum é indicado como agente único eficiente para incêndio classe A.", answer: false, explanation: "O PDF destaca o fosfato de monoamônio ABC como pó eficiente para classe A." },
        { id: "vf-10", statement: "O extintor deve permanecer desobstruído e sinalizado.", answer: true, explanation: "O material reforça acesso, visualização, sinalização e área livre sob o extintor." },
        { id: "vf-11", statement: "A espuma pode ajudar a isolar vapores inflamáveis.", answer: true, explanation: "O PDF descreve a espuma cobrindo a área das chamas e isolando vapores inflamáveis." },
        { id: "vf-12", statement: "O brigadista deve orientar a população fixa e flutuante.", answer: true, explanation: "Essa atribuição aparece nas responsabilidades do brigadista." },
        { id: "vf-13", statement: "Em combustível líquido, pressão muito forte do jato é sempre recomendada.", answer: false, explanation: "O material orienta evitar pressão muito forte para não espalhar inflamável." },
        { id: "vf-14", statement: "Rotas de fuga devem permanecer desobstruídas.", answer: true, explanation: "A NR 23 citada determina que aberturas, saídas e vias de passagem sejam mantidas desobstruídas." },
        { id: "vf-15", statement: "EPI protege a integridade física do brigadista e deve ser fornecido pela empresa.", answer: true, explanation: "O PDF define EPI como material individual para proteção, com fornecimento pela empresa." }
      ]
    },
    {
      id: "fire-class",
      type: "single-choice",
      title: "Classes de incêndio",
      subtitle: "Escolha a classe correta para cada cenário.",
      points: 10,
      options: ["A", "B", "C", "D", "E", "K"],
      questions: [
        { id: "class-01", prompt: "Pilha de papel e papelão em chamas, deixando resíduos.", answer: "A", explanation: "Classe A envolve materiais como papel, madeira, tecidos e fibras, que queimam em superfície e profundidade." },
        { id: "class-02", prompt: "Vazamento de gasolina inflamado em bandeja metálica.", answer: "B", explanation: "Classe B envolve líquidos inflamáveis, como gasolina, óleo, graxas, vernizes e tintas." },
        { id: "class-03", prompt: "Quadro de distribuição energizado com princípio de incêndio.", answer: "C", explanation: "Classe C ocorre em equipamentos elétricos energizados." },
        { id: "class-04", prompt: "Limalha de magnésio aquecida em laboratório.", answer: "D", explanation: "Classe D envolve metais pirofóricos como magnésio, zircônio, titânio, lítio e sódio." },
        { id: "class-05", prompt: "Óleo de cozinha superaquecido em fritadeira industrial.", answer: "K", explanation: "Classe K trata de óleos de cozinha, gorduras e banhas." },
        { id: "class-06", prompt: "Tecido de uniforme armazenado pega fogo em prateleira.", answer: "A", explanation: "Tecidos são exemplos de materiais classe A." },
        { id: "class-07", prompt: "Solvente de limpeza inflamado durante manutenção.", answer: "B", explanation: "Solventes são líquidos inflamáveis, enquadrados como classe B." },
        { id: "class-08", prompt: "Motor elétrico em operação apresenta fumaça e chama.", answer: "C", explanation: "Enquanto energizado, o motor elétrico é classe C." },
        { id: "class-09", prompt: "Fragmentos de titânio entram em combustão.", answer: "D", explanation: "Titânio aparece no PDF como elemento pirofórico de classe D." },
        { id: "class-10", prompt: "Madeira de pallet queima e produz brasa.", answer: "A", explanation: "Madeira é exemplo típico de classe A." },
        { id: "class-11", prompt: "Produto radioativo envolvido em ocorrência de incêndio.", answer: "E", explanation: "O PDF traz classe E para materiais radioativos e recomenda isolamento da área e acionamento especializado." },
        { id: "class-12", prompt: "Balde de tinta inflamável pega fogo somente na superfície.", answer: "B", explanation: "Tintas inflamáveis aparecem como classe B." }
      ]
    },
    {
      id: "extinguisher",
      type: "single-choice",
      title: "Escolha do agente extintor",
      subtitle: "Selecione o agente mais adequado conforme o conteúdo.",
      points: 15,
      options: ["Água", "Espuma mecânica", "Pó químico BC", "Pó químico ABC", "CO2", "Agente classe D", "Solução classe K", "Isolar e acionar apoio especializado"],
      questions: [
        { id: "ext-01", prompt: "Madeira e papel sem risco elétrico energizado.", answer: "Água", explanation: "A água age principalmente por resfriamento e é adequada para materiais classe A quando não há eletricidade energizada." },
        { id: "ext-02", prompt: "Painel elétrico energizado.", answer: "CO2", explanation: "O CO2 é citado como utilizado principalmente em incêndios classe C." },
        { id: "ext-03", prompt: "Líquido inflamável em bandeja, com vapores.", answer: "Espuma mecânica", explanation: "A espuma cobre as chamas, isola vapores inflamáveis e ajuda no resfriamento." },
        { id: "ext-04", prompt: "Gasolina em chamas com necessidade de quebra da reação em cadeia.", answer: "Pó químico BC", explanation: "Pós químicos são eficientes para líquidos inflamáveis, interrompendo radicais livres da combustão." },
        { id: "ext-05", prompt: "Papel em chamas quando só há extintor de pó multiuso adequado.", answer: "Pó químico ABC", explanation: "O PDF aponta o fosfato de monoamônio ABC como eficiente para combustíveis classe A." },
        { id: "ext-06", prompt: "Metal magnésio em combustão.", answer: "Agente classe D", explanation: "Classe D requer agente próprio, como base de cloreto de sódio, observadas restrições do material." },
        { id: "ext-07", prompt: "Óleo vegetal quente em equipamento de cozinha.", answer: "Solução classe K", explanation: "A solução de acetato de potássio é descrita para gordura animal e vegetal quente." },
        { id: "ext-08", prompt: "Material radioativo envolvido no incêndio.", answer: "Isolar e acionar apoio especializado", explanation: "Para classe E o material recomenda isolar a área e acionar CNEN ou Corpo de Bombeiros." },
        { id: "ext-09", prompt: "Motor elétrico energizado em princípio de incêndio.", answer: "CO2", explanation: "CO2 é adequado a classe C; a energia deve ser cortada quando possível por pessoal autorizado." },
        { id: "ext-10", prompt: "Solvente inflamável em superfície aberta.", answer: "Pó químico BC", explanation: "Pó químico comum é aplicado para classes B e C." },
        { id: "ext-11", prompt: "Fibras e tecidos sólidos queimando em profundidade.", answer: "Água", explanation: "Classe A queima em superfície e profundidade; a água resfria e ajuda a evitar reignição." },
        { id: "ext-12", prompt: "Incêndio classe B com risco de espalhar líquido por jato forte.", answer: "Espuma mecânica", explanation: "A espuma cobre a superfície; o PDF alerta para evitar pressão forte que espalhe inflamável." }
      ]
    },
    {
      id: "fill-blank",
      type: "fill-blank",
      title: "Complete a lacuna",
      subtitle: "Até duas tentativas por frase.",
      points: 10,
      questions: [
        { id: "fill-01", prompt: "O agente oxidante mais comum na combustão é o ____ presente no ar.", answers: ["oxigênio", "oxigenio"], explanation: "O PDF define o oxigênio do ar atmosférico como comburente." },
        { id: "fill-02", prompt: "O método que reduz a temperatura do combustível chama-se ____.", answers: ["resfriamento"], explanation: "Resfriamento diminui a temperatura abaixo do ponto de fulgor." },
        { id: "fill-03", prompt: "O método que reduz o contato com oxigênio chama-se ____.", answers: ["abafamento"], explanation: "Abafamento atua reduzindo ou retirando o oxigênio da combustão." },
        { id: "fill-04", prompt: "A separação entre combustível e fonte de energia é o método de ____.", answers: ["isolamento"], explanation: "Isolamento separa combustível, calor ou ambiente incendiado." },
        { id: "fill-05", prompt: "A transferência de calor por corpo sólido é chamada de ____.", answers: ["condução", "conducao"], explanation: "Condução transfere calor de molécula a molécula em sólidos." },
        { id: "fill-06", prompt: "A transferência por movimento de gases ou líquidos é ____.", answers: ["convecção", "conveccao"], explanation: "Convecção ocorre pelo movimento ascendente de massas de gases ou líquidos." },
        { id: "fill-07", prompt: "A transmissão de calor por ondas no espaço é ____.", answers: ["irradiação", "irradiacao"], explanation: "Irradiação é transmissão por ondas de energia calorífica." },
        { id: "fill-08", prompt: "O pó químico ABC citado no PDF é o fosfato de ____.", answers: ["monoamônio", "monoamonio"], explanation: "O fosfato de monoamônio é indicado como pó multiuso ABC." },
        { id: "fill-09", prompt: "As saídas e vias de passagem de emergência devem permanecer ____.", answers: ["desobstruídas", "desobstruidas"], explanation: "A NR 23 citada exige vias e saídas desobstruídas." },
        { id: "fill-10", prompt: "O grupo organizado e capacitado para emergências é a ____.", answers: ["brigada"], explanation: "O material define brigada como grupo capacitado para emergências." },
        { id: "fill-11", prompt: "O hidrante é uma tomada de água onde se conectam ____.", answers: ["mangueiras", "mangueira"], explanation: "O PDF define hidrante como tomada de água para conexão de mangueiras." },
        { id: "fill-12", prompt: "Todo material de uso individual para proteger o brigadista é chamado de ____.", answers: ["EPI", "epi"], explanation: "EPI protege a integridade física do brigadista." }
      ]
    },
    {
      id: "safe-sequence",
      type: "sequence",
      title: "Sequência segura",
      subtitle: "Ordene as etapas usando os botões de mover.",
      points: 20,
      maxAttempts: 2,
      questions: [
        { id: "seq-01", prompt: "Acionamento inicial em emergência", items: ["Identificar o cenário sem se expor ao risco", "Acionar alarme e comunicação de emergência", "Orientar afastamento da área", "Aguardar orientação do líder ou equipe especializada"], explanation: "O brigadista deve avaliar riscos, acionar alarme e manter a equipe orientada." },
        { id: "seq-02", prompt: "Abandono de área", items: ["Interromper atividades com segurança", "Seguir rota de fuga sinalizada", "Manter saídas desobstruídas e sem retorno", "Dirigir-se ao ponto de encontro"], explanation: "A NR 23 destaca evacuação segura, rotas, saídas e ponto de encontro." },
        { id: "seq-03", prompt: "Uso inicial do extintor", items: ["Conferir classe do incêndio e risco elétrico", "Escolher agente extintor adequado", "Aproximar-se cuidadosamente", "Atacar a base do fogo em movimento de leque", "Verificar possibilidade de reignição"], explanation: "O PDF orienta aproximação cuidadosa, jato na base e checagem final." },
        { id: "seq-04", prompt: "Inspeção mensal do extintor", items: ["Verificar pressão fora da faixa vermelha", "Conferir lacre intacto", "Checar bico desobstruído", "Conferir validade e teste hidrostático", "Registrar irregularidade"], explanation: "As condições de uso do extintor incluem pressão, lacre, bico, instruções e prazos." },
        { id: "seq-05", prompt: "Resposta a painel elétrico energizado", items: ["Manter distância segura", "Verificar descargas ou arcos elétricos", "Desenergizar quando autorizado", "Usar agente adequado para classe C", "Proteger-se contra retorno das chamas"], explanation: "O PDF orienta observar descargas, desenergizar quando necessário e proteger-se." },
        { id: "seq-06", prompt: "Definição de rota de fuga", items: ["Reconhecer a área e o foco", "Definir alternativa segura", "Considerar a pior hipótese", "Informar todos os envolvidos", "Monitorar mudança de direção do fogo"], explanation: "O líder deve determinar rota, alternativas e manter a equipe informada." },
        { id: "seq-07", prompt: "Controle de combustível líquido", items: ["Reconhecer líquido inflamável", "Evitar jato com pressão forte", "Aplicar agente sem espalhar o produto", "Isolar fontes de ignição", "Monitorar reignição"], explanation: "O material alerta que pressão forte pode espalhar líquido inflamável." },
        { id: "seq-08", prompt: "Avaliação antes de combate", items: ["Confirmar segurança da equipe", "Identificar classe do incêndio", "Verificar equipamentos disponíveis", "Definir método de extinção", "Comunicar e aguardar orientação se houver dúvida"], explanation: "O PDF reforça segurança, classe, método e comunicação com liderança." }
      ]
    },
    {
      id: "inspection",
      type: "single-choice",
      title: "Inspeção: libera ou bloqueia",
      subtitle: "Decida se a condição é aceitável para a operação.",
      points: 10,
      options: ["LIBERAR", "BLOQUEAR"],
      questions: [
        { id: "insp-01", prompt: "Rota de fuga com paletes obstruindo metade da passagem.", answer: "BLOQUEAR", explanation: "Rotas e vias de emergência devem permanecer desobstruídas." },
        { id: "insp-02", prompt: "Extintor visível, sinalizado, com acesso livre e dentro da validade.", answer: "LIBERAR", explanation: "Essas condições atendem à inspeção descrita no material." },
        { id: "insp-03", prompt: "Extintor com lacre rompido.", answer: "BLOQUEAR", explanation: "O lacre de inviolabilidade deve permanecer intacto." },
        { id: "insp-04", prompt: "Saída de emergência trancada durante a jornada.", answer: "BLOQUEAR", explanation: "A NR 23 proíbe saída de emergência fechada à chave ou presa durante a jornada." },
        { id: "insp-05", prompt: "Hidrante com mangueiras acessíveis e sem obstrução.", answer: "LIBERAR", explanation: "O acesso aos equipamentos de combate precisa estar livre." },
        { id: "insp-06", prompt: "Piso sob extintor ocupado por materiais estocados.", answer: "BLOQUEAR", explanation: "A área destinada ao extintor não pode ser obstruída." },
        { id: "insp-07", prompt: "Bico da válvula do extintor obstruído por sujeira.", answer: "BLOQUEAR", explanation: "A inspeção inclui verificar se o bico permanece desobstruído." },
        { id: "insp-08", prompt: "Instruções de operação do extintor visíveis.", answer: "LIBERAR", explanation: "Instruções visíveis fazem parte das condições verificadas." },
        { id: "insp-09", prompt: "Extintor instalado atrás de pilhas de materiais.", answer: "BLOQUEAR", explanation: "Extintores não podem ser encobertos por pilhas de materiais." },
        { id: "insp-10", prompt: "Porta de emergência com dispositivo de abertura fácil pelo interior.", answer: "LIBERAR", explanation: "A NR 23 admite travamento que permita fácil abertura do interior." },
        { id: "insp-11", prompt: "Sinalização de direção da saída ausente.", answer: "BLOQUEAR", explanation: "Aberturas, saídas e vias de emergência devem ser identificadas e sinalizadas." },
        { id: "insp-12", prompt: "Extintor com ponteiro na faixa vermelha.", answer: "BLOQUEAR", explanation: "A inspeção deve verificar se o indicador de pressão não está na faixa vermelha." }
      ]
    },
    {
      id: "industrial-emergency",
      type: "emergency",
      title: "Emergência industrial",
      subtitle: "Cenários integrados: só pontua se todas as decisões estiverem corretas.",
      points: 30,
      firstBonus: 10,
      questions: [
        {
          id: "emg-01",
          prompt: "Fogo em pilha de papel próxima ao corredor, sem risco elétrico.",
          decisions: [
            { key: "risk", label: "Risco principal", options: ["Material sólido com brasa", "Líquido inflamável", "Metal pirofórico"], answer: "Material sólido com brasa" },
            { key: "class", label: "Classe", options: ["A", "B", "C"], answer: "A" },
            { key: "agent", label: "Agente", options: ["Água", "CO2", "Solução classe K"], answer: "Água" },
            { key: "initial", label: "Conduta inicial", options: ["Acionar alarme e avaliar segurança", "Trancar a saída", "Aplicar jato forte em qualquer direção"], answer: "Acionar alarme e avaliar segurança" },
            { key: "evacuation", label: "Abandono", options: ["Manter rota de fuga livre", "Retornar para buscar objetos", "Usar saída trancada"], answer: "Manter rota de fuga livre" }
          ],
          explanation: "Papel é classe A; água resfria e a rota deve permanecer desobstruída."
        },
        {
          id: "emg-02",
          prompt: "Solvente inflamável queima em uma bandeja de manutenção.",
          decisions: [
            { key: "risk", label: "Risco principal", options: ["Vapores inflamáveis", "Material radioativo", "Tecido sólido"], answer: "Vapores inflamáveis" },
            { key: "class", label: "Classe", options: ["A", "B", "D"], answer: "B" },
            { key: "agent", label: "Agente", options: ["Espuma mecânica", "Água em jato forte", "Solução classe K"], answer: "Espuma mecânica" },
            { key: "initial", label: "Conduta inicial", options: ["Evitar espalhar o líquido", "Aumentar pressão do jato", "Entrar sem comunicar"], answer: "Evitar espalhar o líquido" },
            { key: "evacuation", label: "Abandono", options: ["Isolar área e orientar afastamento", "Agrupar pessoas junto ao foco", "Bloquear o acesso ao hidrante"], answer: "Isolar área e orientar afastamento" }
          ],
          explanation: "Solventes são classe B; a espuma ajuda a isolar vapores e evita espalhamento."
        },
        {
          id: "emg-03",
          prompt: "Quadro elétrico energizado emite fumaça e chama.",
          decisions: [
            { key: "risk", label: "Risco principal", options: ["Choque/arco elétrico", "Óleo de cozinha", "Metal alcalino"], answer: "Choque/arco elétrico" },
            { key: "class", label: "Classe", options: ["C", "K", "D"], answer: "C" },
            { key: "agent", label: "Agente", options: ["CO2", "Água em jato contínuo", "Soro fisiológico"], answer: "CO2" },
            { key: "initial", label: "Conduta inicial", options: ["Desenergizar quando autorizado", "Tocar no painel", "Usar água antes de avaliar"], answer: "Desenergizar quando autorizado" },
            { key: "evacuation", label: "Abandono", options: ["Orientar afastamento seguro", "Manter curiosos próximos", "Fechar saída à chave"], answer: "Orientar afastamento seguro" }
          ],
          explanation: "Classe C envolve equipamento energizado; CO2 é citado para esse uso e a segurança da equipe vem primeiro."
        },
        {
          id: "emg-04",
          prompt: "Fritadeira industrial com óleo superaquecido em chamas.",
          decisions: [
            { key: "risk", label: "Risco principal", options: ["Gordura quente", "Papel seco", "Material radioativo"], answer: "Gordura quente" },
            { key: "class", label: "Classe", options: ["K", "A", "E"], answer: "K" },
            { key: "agent", label: "Agente", options: ["Solução classe K", "Água em jato contínuo", "Pó para metal"], answer: "Solução classe K" },
            { key: "initial", label: "Conduta inicial", options: ["Não espalhar o óleo", "Jogar água", "Mover a fritadeira acesa"], answer: "Não espalhar o óleo" },
            { key: "evacuation", label: "Abandono", options: ["Afastar equipe e isolar cozinha", "Manter operação normal", "Abrir rota obstruída depois"], answer: "Afastar equipe e isolar cozinha" }
          ],
          explanation: "Classe K usa agente saponificante próprio para gorduras quentes."
        },
        {
          id: "emg-05",
          prompt: "Fragmentos de magnésio em combustão durante processo industrial.",
          decisions: [
            { key: "risk", label: "Risco principal", options: ["Metal pirofórico", "Motor energizado", "Tinta inflamável"], answer: "Metal pirofórico" },
            { key: "class", label: "Classe", options: ["D", "B", "C"], answer: "D" },
            { key: "agent", label: "Agente", options: ["Agente classe D", "Água", "Espuma comum"], answer: "Agente classe D" },
            { key: "initial", label: "Conduta inicial", options: ["Isolar e acionar apoio treinado", "Improvisar água", "Aproximar sem EPI"], answer: "Isolar e acionar apoio treinado" },
            { key: "evacuation", label: "Abandono", options: ["Retirar pessoas da zona de risco", "Permitir circulação", "Bloquear rota com materiais"], answer: "Retirar pessoas da zona de risco" }
          ],
          explanation: "Classe D exige agente específico e controle por pessoal treinado."
        },
        {
          id: "emg-06",
          prompt: "Foco próximo a saída sinalizada que começa a comprometer a rota principal.",
          decisions: [
            { key: "risk", label: "Risco principal", options: ["Bloqueio de rota de fuga", "Picada de animal", "Queimadura química"], answer: "Bloqueio de rota de fuga" },
            { key: "class", label: "Classe", options: ["Avaliar material envolvido", "Sempre classe K", "Sempre classe E"], answer: "Avaliar material envolvido" },
            { key: "agent", label: "Agente", options: ["Definir após identificar classe", "Usar qualquer agente", "Ignorar equipamentos"], answer: "Definir após identificar classe" },
            { key: "initial", label: "Conduta inicial", options: ["Comunicar líder e definir rota alternativa", "Conduzir pessoas para o foco", "Esperar sem alarme"], answer: "Comunicar líder e definir rota alternativa" },
            { key: "evacuation", label: "Abandono", options: ["Usar alternativa segura e ponto de encontro", "Retornar pela rota comprometida", "Manter saída trancada"], answer: "Usar alternativa segura e ponto de encontro" }
          ],
          explanation: "O líder deve considerar alternativas, pior hipótese e manter todos informados."
        }
      ]
    }
  ]
};
