export const firstAidModule = {
  id: "first-aid",
  title: "Primeiros Socorros",
  shortTitle: "Primeiros Socorros",
  theme: "aid",
  source: "docs/Brigada Industrial correta.pdf",
  notice: "Este jogo reforça o conteúdo do treinamento e não substitui avaliação prática, protocolos locais ou atendimento profissional.",
  activities: [
    {
      id: "aid-assessment",
      type: "single-choice",
      title: "Avaliação inicial",
      points: 10,
      options: ["Segurança do socorrista", "Pressa para remover a vítima", "Aplicar medicamento", "Ignorar terceiros"],
      questions: [
        { id: "aid-assess-01", prompt: "Antes de abordar a vítima, a primeira preocupação citada no PDF é:", answer: "Segurança do socorrista", explanation: "O material lista segurança do socorrista, da vítima e de todos antes da abordagem." },
        { id: "aid-assess-02", prompt: "Na análise primária, deve-se verificar:", options: ["Responsividade, vias aéreas, respiração, circulação e grandes hemorragias", "Apenas documentos da vítima", "Somente temperatura ambiente", "Somente dor local"], answer: "Responsividade, vias aéreas, respiração, circulação e grandes hemorragias", explanation: "Esses pontos aparecem na análise primária do PDF." },
        { id: "aid-assess-03", prompt: "Se a vítima fala ou chora, isso indica que:", options: ["As vias aéreas estão abertas", "Há parada cardiorrespiratória confirmada", "A vítima não precisa de observação", "Não houve acidente"], answer: "As vias aéreas estão abertas", explanation: "O PDF afirma que fala ou choro indicam vias aéreas abertas." },
        { id: "aid-assess-04", prompt: "Para avaliar respiração, o material orienta observar por:", options: ["10 segundos", "1 segundo", "5 minutos", "30 minutos"], answer: "10 segundos", explanation: "O PDF orienta olhar, ouvir e sentir a respiração por 10 segundos." }
      ]
    },
    {
      id: "aid-true-false",
      type: "true-false",
      title: "Verdadeiro ou falso - socorro",
      points: 10,
      questions: [
        { id: "aid-vf-01", statement: "Primeiros socorros são medidas iniciais fora do ambiente hospitalar para preservar a vida e evitar agravamento.", answer: true, explanation: "Essa é a definição apresentada no PDF." },
        { id: "aid-vf-02", statement: "O brigadista deve correr riscos desnecessários para prestar atendimento.", answer: false, explanation: "O material orienta fazer o melhor possível sem correr riscos desnecessários." },
        { id: "aid-vf-03", statement: "A movimentação da vítima deve evitar ou minimizar outras lesões.", answer: true, explanation: "O PDF destaca técnicas para evitar agravamento ao mover a vítima." },
        { id: "aid-vf-04", statement: "DEA analisa ritmo cardíaco e orienta choque quando indicado.", answer: true, explanation: "O DEA é descrito como semiautomático e de fácil uso, com análise de ritmo." },
        { id: "aid-vf-05", statement: "Em primeiros socorros para socorristas leigos, o PDF usa somente massagem cardíaca.", answer: true, explanation: "O material traz a orientação de massagem cardíaca para leigos." }
      ]
    },
    {
      id: "aid-rcp-sequence",
      type: "sequence",
      title: "Sequência de RCP e DEA",
      points: 20,
      maxAttempts: 2,
      questions: [
        { id: "aid-rcp-01", prompt: "Uso do DEA", items: ["Chegada do DEA", "Ligar e abrir o DEA", "Colocar as pás", "Aguardar análise do ritmo", "Reiniciar RCP imediatamente após choque quando indicado"], explanation: "A sequência segue as páginas do DEA: chegada, ligar, pás, análise/choque e reinício da RCP." },
        { id: "aid-rcp-02", prompt: "Compressões torácicas", items: ["Posicionar vítima em superfície rígida", "Colocar mãos no centro do tórax", "Comprimir 5 a 6 cm", "Permitir retorno do tórax", "Manter frequência acima de 100 e até 120 por minuto"], explanation: "O PDF descreve superfície rígida, centro do tórax, profundidade, retorno e frequência." },
        { id: "aid-rcp-03", prompt: "Quando alternar o responsável pela compressão", items: ["Iniciar compressões", "Manter ritmo adequado", "Completar cerca de 2 minutos", "Alternar o responsável", "Retomar compressões"], explanation: "O material orienta alternar o responsável pela compressão a cada 2 minutos." },
        { id: "aid-rcp-04", prompt: "Avaliação da vítima sem respiração normal", items: ["Garantir segurança da cena", "Verificar responsividade", "Abrir vias aéreas", "Verificar respiração por 10 segundos", "Acionar ajuda e iniciar protocolo local"], explanation: "A sequência preserva a segurança e usa a análise primária citada no PDF." }
      ]
    },
    {
      id: "aid-hemorrhage",
      type: "single-choice",
      title: "Controle de hemorragias",
      points: 10,
      options: ["Comprimir com pano limpo", "Furar o ferimento", "Dar bebida alcoólica", "Ignorar sangramento"],
      questions: [
        { id: "aid-hem-01", prompt: "Conduta inicial para hemorragia externa no PDF:", answer: "Comprimir com pano limpo", explanation: "A conduta citada é comprimir o local com pano limpo." },
        { id: "aid-hem-02", prompt: "Quando possível, na hemorragia deve-se:", options: ["Elevar o membro", "Cortar o local", "Aplicar terra", "Fazer sucção"], answer: "Elevar o membro", explanation: "O material orienta elevar o membro quando possível." },
        { id: "aid-hem-03", prompt: "Hemorragia interna é mais difícil de perceber porque:", options: ["O sangue acumula em cavidades do corpo", "Sempre é visível", "Nunca causa sinais", "Só ocorre no nariz"], answer: "O sangue acumula em cavidades do corpo", explanation: "O PDF define hemorragia interna como acúmulo em cavidades craniana, torácica e abdominal." },
        { id: "aid-hem-04", prompt: "No sangramento nasal, o PDF orienta:", options: ["Manter a vítima sentada e comprimir a narina", "Assoar o nariz com força", "Deitar de barriga para baixo", "Aplicar pó de café"], answer: "Manter a vítima sentada e comprimir a narina", explanation: "A orientação inclui tranquilizar, manter sentada, não assoar e comprimir a narina por 5 a 10 minutos." }
      ]
    },
    {
      id: "aid-burns",
      type: "single-choice",
      title: "Condutas em queimaduras",
      points: 10,
      options: ["Resfriar com água corrente", "Estourar bolhas", "Aplicar manteiga", "Aplicar gelo direto"],
      questions: [
        { id: "aid-burn-01", prompt: "Em queimadura de 1º grau, o PDF orienta:", answer: "Resfriar com água corrente", explanation: "O material orienta resfriar com soro fisiológico ou água fria em abundância até aliviar a dor." },
        { id: "aid-burn-02", prompt: "Em queimadura de 2º grau com bolhas, deve-se:", options: ["Não estourar bolhas", "Retirar pele rompida", "Aplicar álcool", "Esfregar o local"], answer: "Não estourar bolhas", explanation: "O PDF afirma que não se deve estourar bolhas nem retirar pele já rompida." },
        { id: "aid-burn-03", prompt: "Queimaduras de 3º e 4º grau exigem:", options: ["Atendimento médico o quanto antes", "Somente creme dental", "Raspagem local", "Retorno ao trabalho"], answer: "Atendimento médico o quanto antes", explanation: "O material orienta levar ao hospital próximo em queimaduras graves." },
        { id: "aid-burn-04", prompt: "Em queimadura química na pele, deve-se:", options: ["Lavar com água corrente por 10 a 20 minutos", "Neutralizar com produto desconhecido", "Cobrir apertado", "Aguardar secar"], answer: "Lavar com água corrente por 10 a 20 minutos", explanation: "O PDF orienta remover o produto lavando com água corrente por 10 a 20 minutos." }
      ]
    },
    {
      id: "aid-seizure-fainting",
      type: "single-choice",
      title: "Convulsão e desmaio",
      points: 10,
      options: ["Proteger a cabeça", "Imobilizar braços e pernas", "Colocar objeto na boca", "Oferecer bebida"],
      questions: [
        { id: "aid-conv-01", prompt: "Em crise convulsiva, uma conduta citada é:", answer: "Proteger a cabeça", explanation: "O PDF orienta proteger a cabeça com a mão, roupa ou travesseiro." },
        { id: "aid-conv-02", prompt: "Durante convulsão, o material orienta:", options: ["Não imobilizar membros", "Prender braços e pernas", "Dar alimento", "Sacudir a vítima"], answer: "Não imobilizar membros", explanation: "A orientação explícita é não imobilizar braços e pernas." },
        { id: "aid-faint-01", prompt: "Desmaio é descrito como:", options: ["Perda momentânea da consciência por falta de oxigenação cerebral", "Fratura exposta", "Queimadura química", "Hemorragia externa"], answer: "Perda momentânea da consciência por falta de oxigenação cerebral", explanation: "Essa definição aparece no trecho sobre desmaios." },
        { id: "aid-faint-02", prompt: "Se o desmaio durar mais de 2 minutos, o PDF orienta:", options: ["Encaminhar ao hospital", "Ignorar", "Aplicar creme", "Trancar a vítima no local"], answer: "Encaminhar ao hospital", explanation: "A orientação é encaminhar ao hospital se durar mais de 2 minutos." }
      ]
    },
    {
      id: "aid-airway",
      type: "single-choice",
      title: "Desobstrução de vias aéreas",
      points: 10,
      options: ["Tapotagens e manobra de Heimlich", "Gelo direto e pomada", "Cortar o local", "Dar álcool"],
      questions: [
        { id: "aid-air-01", prompt: "Para obstrução em adulto e criança consciente, o PDF cita:", answer: "Tapotagens e manobra de Heimlich", explanation: "O material lista tapotagens e manobra de Heimlich." },
        { id: "aid-air-02", prompt: "Vias aéreas liberadas permitem:", options: ["Respirar", "Classificar incêndio", "Aumentar pressão do extintor", "Sinalizar rota"], answer: "Respirar", explanation: "O PDF afirma que as vias aéreas devem estar liberadas para ser possível respirar." },
        { id: "aid-air-03", prompt: "Na análise primária, verificar permeabilidade das vias aéreas vem junto de:", options: ["Responsividade e respiração", "Cálculo de ranking", "Escolha de EPI industrial", "Inspeção do lacre"], answer: "Responsividade e respiração", explanation: "A análise primária reúne consciência, vias aéreas, respiração, circulação e grandes hemorragias." },
        { id: "aid-air-04", prompt: "Se a pessoa fala após engasgo parcial:", options: ["Há passagem de ar, mas deve ser observada", "A via aérea está sempre totalmente bloqueada", "A RCP deve ser feita sem avaliação", "A cena deixa de precisar de segurança"], answer: "Há passagem de ar, mas deve ser observada", explanation: "O material associa fala/choro a vias aéreas abertas; a equipe deve observar e seguir protocolo local." }
      ]
    },
    {
      id: "aid-venomous",
      type: "single-choice",
      title: "Animais peçonhentos",
      points: 10,
      options: ["Lavar o local e procurar serviço médico", "Fazer torniquete", "Cortar e sugar", "Aplicar terra"],
      questions: [
        { id: "aid-ven-01", prompt: "Em acidente com animal peçonhento, o PDF orienta:", answer: "Lavar o local e procurar serviço médico", explanation: "O material lista lavar o local, usar compressas mornas para dor, procurar serviço médico e levar o animal para identificação quando possível." },
        { id: "aid-ven-02", prompt: "O que NÃO fazer em acidente com animal peçonhento:", options: ["Fazer torniquete", "Procurar serviço médico", "Lavar o local", "Levar o animal para identificação quando possível"], answer: "Fazer torniquete", explanation: "O PDF proíbe torniquete ou garrote, cortes, sucção e aplicação de folhas, pó de café ou terra." },
        { id: "aid-ven-03", prompt: "Acidente elapídico com coral deve ser considerado:", options: ["Grave", "Sem risco", "Classe A", "Apenas irritação local"], answer: "Grave", explanation: "O material afirma que todo acidente elapídico deve ser considerado grave." },
        { id: "aid-ven-04", prompt: "Se houver múltiplas picadas de abelha, deve-se:", options: ["Receber atendimento médico", "Esfregar o local", "Ignorar sinais alérgicos", "Aplicar querosene"], answer: "Receber atendimento médico", explanation: "O PDF orienta atendimento médico em múltiplas picadas." },
        { id: "aid-ven-05", prompt: "Sintomas alérgicos graves em picada de abelha podem evoluir para:", options: ["Choque anafilático ou edema de glote", "Apenas vermelhidão leve", "Combustão", "Classe C"], answer: "Choque anafilático ou edema de glote", explanation: "O material alerta para evolução a choque anafilático ou edema de glote." }
      ]
    }
  ]
};
