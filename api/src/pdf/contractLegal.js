import {
  formatCurrency,
  commissionRangeLabel,
  buildCommissionExamples,
  formatClientAddress,
} from './legalHelpers.js';

export const LEGAL_INSTRUMENT_TITLE =
  'INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS';

export const LEGAL_INSTRUMENT_SUBTITLE =
  'GESTÃO DE TRÁFEGO PAGO, PERFORMANCE E REMUNERAÇÃO CONTRATUAL';

function brandName(settings) {
  return settings?.companyName || 'Symbius';
}

function legalCompany(settings) {
  return settings?.legalName || settings?.companyName || 'Lauto Branding LTDA';
}

function clientLabel(client, contract) {
  return (
    client?.legalName ||
    client?.tradeName ||
    contract?.acceptanceClientName ||
    'a CONTRATANTE'
  );
}

function docLabel(client) {
  if (!client?.document) return null;
  const kind = client.documentType === 'cpf' ? 'CPF' : 'CNPJ';
  return `${kind} nº ${client.document}`;
}

function partyContext(settings, client, contract) {
  const brand = brandName(settings);
  const company = legalCompany(settings);
  const clientName = clientLabel(client, contract);
  return { brand, company, clientName };
}

/** @returns {{ title: string, blocks: Array<{type:string, text?:string, items?:string[], table?:{headers:string[], rows:string[][]}}> }} */
export function buildClause7(contract) {
  const blocks = [];
  let n = 0;
  const sub = (text) => {
    n += 1;
    blocks.push({ type: 'p', text: `7.${n}. ${text}` });
  };
  const bullets = (items) => {
    blocks.push({ type: 'ul', items: items.filter(Boolean) });
  };

  if (contract.setupEnabled) {
    sub(
      `A CONTRATANTE pagará à CONTRATADA o valor único de ${formatCurrency(
        contract.setupPrice,
      )} a título de ${contract.setupTitle || 'investimento de setup'}, referente à estruturação inicial do projeto${
        contract.setupDescription ? `, observadas as seguintes condições: ${contract.setupDescription}` : '.'
      }`.replace(/\.\.$/, '.'),
    );
    if (contract.setupDueDays != null) {
      blocks.push({
        type: 'p',
        text: `O pagamento do setup deverá ocorrer em até ${Number(contract.setupDueDays) || 0} dia(s) contado(s) da assinatura deste instrumento, salvo prazo diverso acordado por escrito.`,
      });
    }
  }

  if (contract.feeEnabled) {
    sub(
      `Pela operação contínua, a CONTRATANTE pagará à CONTRATADA o fee mensal de ${formatCurrency(
        contract.feePrice,
      )} (${contract.feeTitle || 'fee mensal'})${
        contract.feeDescription ? `, ${contract.feeDescription}` : ''
      }. O pagamento deverá ocorrer até o dia ${contract.feePayDay ?? 5} de cada mês, mediante emissão da respectiva nota fiscal.`,
    );
    blocks.push({
      type: 'p',
      text:
        'O atraso no pagamento do fee acarretará multa moratória de 2% (dois por cento), juros de 1% (um por cento) ao mês calculados pro rata die e correção monetária pelo IPCA, sem prejuízo da suspensão dos serviços após comunicação à CONTRATANTE.',
    });
  }

  if (contract.commissionEnabled) {
    const base =
      contract.commissionBaseLabel || 'Receita Bruta Atribuída';
    sub(
      `Além das demais remunerações eventualmente previstas neste instrumento, a CONTRATADA fará jus a uma comissão calculada sobre a ${base} apurada em cada mês, de acordo com a faixa mensal abaixo:`,
    );
    const tiers = contract.commissionTiers || [];
    blocks.push({
      type: 'table',
      table: {
        headers: ['RECEITA BRUTA ATRIBUÍDA NO MÊS', 'COMISSÃO APLICÁVEL'],
        rows: tiers.map((tier) => [
          commissionRangeLabel(tier),
          `${tier.percent}%`,
        ]),
      },
    });
    sub(
      'O modelo acima é não progressivo: a porcentagem correspondente à faixa atingida no mês será aplicada integralmente sobre toda a Receita Bruta Atribuída daquele mês.',
    );
    const examples =
      contract.commissionExamples?.length > 0
        ? contract.commissionExamples
        : buildCommissionExamples(tiers);
    if (examples.length) {
      sub('Exemplos de aplicação:');
      bullets(
        examples.map(
          (ex) =>
            `Receita Bruta Atribuída de ${formatCurrency(ex.revenue)}: comissão de ${ex.percent}%, equivalente a ${formatCurrency(ex.value)};`,
        ),
      );
    }
    const closeDay = contract.commissionCloseDay ?? 5;
    const payDay = contract.commissionPayDay ?? 6;
    sub(
      `Até o 3º (terceiro) dia de cada mês, a CONTRATANTE disponibilizará os dados completos do mês anterior. O fechamento será realizado até o dia ${closeDay}, e o pagamento da comissão deverá ocorrer até o dia ${payDay} do mesmo mês. Caso a data recaia em dia não útil bancário, o pagamento será realizado no primeiro dia útil seguinte.`,
    );
    sub(
      'Após a apuração, a CONTRATADA emitirá a respectiva nota fiscal. Tributos sujeitos a retenção serão tratados conforme a legislação aplicável, mediante envio dos comprovantes correspondentes.',
    );
    sub(
      'O atraso no pagamento da comissão acarretará multa moratória de 2% (dois por cento), juros de 1% (um por cento) ao mês calculados pro rata die e correção monetária pelo IPCA, sem prejuízo da suspensão dos serviços após comunicação à CONTRATANTE.',
    );
  }

  if (contract.mediaEnabled) {
    sub(
      `A verba de mídia${
        contract.mediaMonthlyBudget > 0
          ? ` prevista de ${formatCurrency(contract.mediaMonthlyBudget)} por mês`
          : ''
      } será investida e paga diretamente pela CONTRATANTE às plataformas de anúncios e demais fornecedores de mídia. Esse valor não integra a remuneração da CONTRATADA.`,
    );
    if (contract.mediaNotes) {
      blocks.push({ type: 'p', text: contract.mediaNotes });
    }
  }

  if (!blocks.length) {
    sub(
      'A remuneração será definida conforme as condições negociadas entre as Partes e registradas neste instrumento ou em aditivo escrito.',
    );
  }

  return {
    title: '7. REMUNERAÇÃO',
    blocks,
  };
}

export function buildClause8(contract) {
  const blocks = [];
  const start = contract.startDate || '____/____/______';
  const minDays = Number(contract.minTermDays) || 90;
  let n = 0;
  const sub = (text) => {
    n += 1;
    blocks.push({ type: 'p', text: `8.${n}. ${text}` });
  };

  sub(
    `O contrato terá início em ${start} e prazo mínimo inicial de ${minDays} (${minDays}) dias, necessário à estruturação das campanhas, coleta de dados, testes e otimizações.`,
  );
  sub(
    'Encerrado o prazo mínimo, o contrato será renovado automaticamente por prazo indeterminado, podendo ser rescindido por qualquer Parte mediante aviso prévio escrito de 30 (trinta) dias.',
  );
  sub(
    'Durante o prazo mínimo, as Partes comprometem-se com a continuidade operacional do projeto. A rescisão não prejudicará o pagamento das remunerações já apuradas ou que venham a ser devidas em razão de serviços prestados ou vendas vinculadas a leads gerados durante a vigência.',
  );

  if (contract.commissionEnabled) {
    sub(
      'As Vendas Atribuídas decorrentes de Leads de Mídia Paga captados durante a vigência e concluídas em até 90 (noventa) dias após o término permanecerão sujeitas à comissão, observados os critérios da Cláusula 6.',
    );
  }

  sub(
    'O contrato poderá ser rescindido imediatamente por justa causa se houver descumprimento relevante não sanado em até 10 (dez) dias corridos após notificação, uso ilícito das campanhas ou materiais, violação grave de confidencialidade ou proteção de dados, fraude na apuração, insolvência ou atraso de pagamento superior a 15 (quinze) dias.',
  );
  sub(
    'No encerramento, a CONTRATADA interromperá a gestão, apresentará o fechamento pendente e manterá disponíveis à CONTRATANTE os ativos que sejam de sua titularidade, desde que não existam valores vencidos e observadas as limitações de propriedade intelectual previstas neste contrato.',
  );

  return { title: '8. PRAZO, RENOVAÇÃO E RESCISÃO', blocks };
}

function fixedClauses(ctx) {
  const { brand, company, clientName, meetingDays } = ctx;
  return [
    {
      title: '1. OBJETO E FINALIDADE',
      blocks: [
        {
          type: 'p',
          text: `1.1. O presente contrato tem por objeto a prestação, pela CONTRATADA, de serviços de planejamento, configuração, gestão, monitoramento e otimização de campanhas de tráfego pago da CONTRATANTE nas plataformas Meta Ads e Google Ads, incluindo análise inicial da infraestrutura de aquisição e mensuração, direcionamento estratégico de criativos e acompanhamento dos resultados no funil comercial.`,
        },
        {
          type: 'p',
          text: `1.2. A atuação da CONTRATADA será limitada à geração e à otimização de demanda por mídia paga. O serviço constitui obrigação de meio, e não de resultado, não havendo garantia de faturamento, volume mínimo de leads, retorno sobre investimento, custo por aquisição, aprovação de anúncios ou qualquer outro resultado comercial específico.`,
        },
        {
          type: 'p',
          text: `1.3. A CONTRATADA é a pessoa jurídica ${company}, que atua comercialmente sob a marca ${brand}. Qualquer referência à “${brand}” neste instrumento deverá ser entendida como referência à CONTRATADA.`,
        },
      ],
    },
    {
      title: '2. ESCOPO DOS SERVIÇOS',
      blocks: [
        {
          type: 'p',
          text: '2.1. Análise inicial da operação de aquisição, restrita aos elementos necessários à gestão de tráfego pago e à mensuração de resultados, compreendendo:',
        },
        {
          type: 'ul',
          items: [
            'avaliação do cenário comercial, oferta, jornada de compra e funil de conversão;',
            'análise das contas de anúncios, campanhas anteriores, públicos, pixels, tags, eventos de conversão e demais mecanismos de rastreamento;',
            'análise da estrutura e da qualidade dos dados disponíveis no CRM, no BI, no site, nas páginas de destino e em ferramentas de analytics, quando existentes;',
            'identificação de falhas de mensuração, gargalos de passagem entre marketing e vendas e oportunidades de melhoria relacionadas às campanhas pagas; e',
            'recomendações de ajustes técnicos ou operacionais a serem executados pela CONTRATANTE ou por terceiros por ela contratados.',
          ],
        },
        {
          type: 'p',
          text: '2.2. Planejamento e gestão de mídia paga, compreendendo:',
        },
        {
          type: 'ul',
          items: [
            'definição de estratégia de campanhas, objetivos, estrutura, públicos, segmentações, canais, distribuição de verba e hipóteses de teste;',
            'configuração, criação, publicação e organização das campanhas nas plataformas contratadas;',
            'monitoramento da veiculação, dos investimentos e dos principais indicadores de desempenho;',
            'otimizações de orçamento, públicos, anúncios, palavras-chave, posicionamentos, lances e demais variáveis disponíveis nas plataformas;',
            'realização de testes e ajustes com base nos dados coletados; e',
            'acompanhamento dos resultados em dashboard, sistema próprio ou ferramenta definida pela CONTRATADA.',
          ],
        },
        {
          type: 'p',
          text: '2.3. Direcionamento de criativos para o time interno da CONTRATANTE, compreendendo a elaboração de briefings e solicitações com indicação de conceitos, mensagens, ofertas, formatos, dimensões, variações, volume de peças, referências, hipóteses de teste e demais requisitos necessários às campanhas.',
        },
        {
          type: 'p',
          text: '2.4. Análise do fluxo dos leads e das vendas no CRM e/ou BI, com o objetivo de verificar a qualidade das oportunidades originadas pelas campanhas, identificar perdas no funil e orientar ajustes de mídia. Essa atividade não inclui a operação do CRM, o atendimento dos leads, a gestão da equipe comercial ou a implementação técnica de integrações.',
        },
        {
          type: 'p',
          text: `2.5. Realização de 1 (uma) reunião de acompanhamento a cada ${meetingDays} (${meetingDays}) dias, destinada à revisão de indicadores, análise do funil, definição de prioridades e alinhamento dos próximos testes.`,
        },
      ],
    },
    {
      title: '3. ITENS EXPRESSAMENTE FORA DO ESCOPO',
      blocks: [
        {
          type: 'p',
          text: '3.1. Salvo contratação adicional por escrito, não fazem parte do presente contrato:',
        },
        {
          type: 'ul',
          items: [
            'diagnóstico completo de marca, auditoria ampla de todos os canais digitais, pesquisa formal de público-alvo, reposicionamento ou posicionamento de marca;',
            'criação, redação final, design, captação, edição ou produção de peças gráficas, fotografias, vídeos, animações, páginas de destino ou quaisquer materiais publicitários;',
            'gestão de redes sociais, conteúdo orgânico, relacionamento com influenciadores, assessoria de imprensa ou ações não relacionadas à mídia paga;',
            'desenvolvimento, manutenção ou correção de site, e-commerce, landing pages, CRM, BI, ERP, integrações, automações, APIs, pixels, tags ou ferramentas de terceiros;',
            'atendimento comercial, qualificação, negociação, fechamento de vendas, cobrança, pós-venda, logística, estoque, entrega, definição de preços, promoções ou condições comerciais;',
            'verba de mídia, licenças, assinaturas, taxas de plataforma, ferramentas, produção criativa ou contratação de terceiros; e',
            'garantia de resultados, faturamento mínimo, volume mínimo de vendas, leads ou retorno financeiro.',
          ],
        },
      ],
    },
    {
      title: '4. RESPONSABILIDADES DA CONTRATADA',
      blocks: [
        {
          type: 'p',
          text: '4.1. Executar os serviços com diligência técnica, observando o escopo, os limites de orçamento aprovados e as políticas das plataformas de anúncios.',
        },
        {
          type: 'p',
          text: '4.2. Fornecer direcionamentos e briefings de criativos ao time indicado pela CONTRATANTE, bem como avaliar a adequação das peças entregues aos objetivos das campanhas.',
        },
        {
          type: 'p',
          text: '4.3. Informar à CONTRATANTE, em prazo razoável, problemas de rastreamento, indisponibilidade de contas, reprovação de anúncios, falta de verba, falhas no site, ausência de criativos ou outros fatores que possam comprometer a operação.',
        },
        {
          type: 'p',
          text: '4.4. Manter sigilo sobre acessos, informações estratégicas, dados comerciais e dados pessoais a que tiver acesso em razão deste contrato.',
        },
        {
          type: 'p',
          text: '4.5. A CONTRATADA poderá redistribuir a verba entre campanhas, conjuntos, anúncios, públicos e canais, dentro do limite total aprovado pela CONTRATANTE, sempre com o objetivo de otimizar a performance. Alterações relevantes de orçamento total dependerão de autorização da CONTRATANTE.',
        },
        {
          type: 'p',
          text: '4.6. A CONTRATADA poderá pausar ou deixar de publicar campanhas quando identificar falta de verba, ausência de material, risco jurídico ou regulatório, violação de política de plataforma, falha técnica relevante ou ausência de aprovação necessária, comunicando a CONTRATANTE.',
        },
      ],
    },
    {
      title: '5. RESPONSABILIDADES DA CONTRATANTE',
      blocks: [
        {
          type: 'p',
          text: '5.1. Disponibilizar, em nível de acesso administrativo ou equivalente, as contas, plataformas, dados e informações necessárias, incluindo Meta Business Manager, Meta Ads, Google Ads, Google Analytics, Google Tag Manager, site, páginas de destino, CRM, BI, relatórios de vendas e demais ambientes relacionados ao projeto.',
        },
        {
          type: 'p',
          text: '5.2. Manter ativa a forma de pagamento das plataformas e investir a verba de mídia acordada, paga diretamente aos respectivos fornecedores. A verba de mídia não integra a remuneração da CONTRATADA.',
        },
        {
          type: 'p',
          text: '5.3. Produzir e entregar, por meio de sua equipe interna ou fornecedores, os criativos, textos finais, vídeos, imagens, páginas e demais materiais solicitados nos briefings, dentro dos prazos acordados, garantindo que estejam tecnicamente adequados e disponíveis para veiculação.',
        },
        {
          type: 'p',
          text: '5.4. Garantir a veracidade e a legalidade de todas as informações, ofertas, alegações, preços, benefícios, imagens, marcas e materiais fornecidos, incluindo a obtenção de licenças, direitos autorais, autorizações de uso de imagem e aprovações sanitárias, profissionais ou regulatórias aplicáveis.',
        },
        {
          type: 'p',
          text: '5.5. Manter o CRM e os relatórios comerciais atualizados, registrando corretamente origem do lead, data de entrada, responsável, etapa, status, valor da venda, data do pagamento, cancelamentos, estornos e demais informações necessárias à atribuição dos resultados.',
        },
        {
          type: 'p',
          text: '5.6. Gerenciar integralmente a operação comercial e operacional, incluindo atendimento, velocidade de resposta, qualificação, fechamento, cobrança, estoque, site, checkout, entrega, preços, promoções e pós-venda.',
        },
        {
          type: 'p',
          text: '5.7. Fornecer aprovações, feedbacks e decisões dentro dos prazos acordados. Atrasos, falta de acesso, ausência de verba, indisponibilidade de criativos ou informações incompletas suspenderão os prazos e afastarão a responsabilidade da CONTRATADA por impactos decorrentes dessas ocorrências.',
        },
        {
          type: 'p',
          text: '5.8. Não alterar, excluir ou duplicar campanhas, pixels, tags, integrações, nomenclaturas ou configurações sob gestão da CONTRATADA sem alinhamento prévio, quando a alteração puder afetar a performance ou a mensuração.',
        },
      ],
    },
    {
      title: '6. RASTREAMENTO, ATRIBUIÇÃO E APURAÇÃO DAS VENDAS',
      blocks: [
        {
          type: 'p',
          text: '6.1. Para fins deste contrato, considera-se “Lead de Mídia Paga” o contato ou cliente cuja origem identificável tenha ocorrido por meio de campanha paga criada ou gerida pela CONTRATADA, comprovada por UTMs, identificadores de campanha, formulários, eventos de conversão, registros de plataforma, integrações, CRM, BI ou outro mecanismo de rastreamento aceito pelas Partes.',
        },
        {
          type: 'p',
          text: '6.2. Considera-se “Venda Atribuída” a venda efetivamente concluída e paga, vinculada a um Lead de Mídia Paga. Para vendas conduzidas por CRM, serão consideradas as conversões realizadas em até 90 (noventa) dias contados da entrada do lead, salvo prazo distinto formalmente acordado entre as Partes.',
        },
        {
          type: 'p',
          text: '6.3. Considera-se “Receita Bruta Atribuída” o valor bruto efetivamente recebido pela CONTRATANTE no mês de referência em razão das Vendas Atribuídas, antes da incidência de tributos e taxas, excluídos cancelamentos, estornos, chargebacks, devoluções e valores não recebidos.',
        },
        {
          type: 'p',
          text: '6.4. Recompras ou novas vendas realizadas por clientes já existentes somente integrarão a Receita Bruta Atribuída quando houver nova interação comprovadamente vinculada a campanha paga gerida pela CONTRATADA, dentro da janela de atribuição aplicável.',
        },
        {
          type: 'p',
          text: '6.5. O CRM, ERP, sistema financeiro ou relatório de pedidos da CONTRATANTE será a fonte de confirmação do valor e do efetivo recebimento da venda. As plataformas de anúncios, ferramentas de analytics, UTMs e registros técnicos serão utilizados para confirmar a origem da oportunidade.',
        },
        {
          type: 'p',
          text: '6.6. Em caso de divergência entre plataformas, CRM e sistema financeiro, as Partes deverão realizar conferência conjunta, considerando o conjunto de evidências disponíveis. Nenhuma venda poderá ser excluída da base apenas pela ausência de um único identificador quando houver outros elementos técnicos consistentes que comprovem a origem paga.',
        },
        {
          type: 'p',
          text: '6.7. A CONTRATANTE autoriza a CONTRATADA a consultar os relatórios necessários à apuração e compromete-se a preservar os dados de origem e histórico das oportunidades. A omissão, alteração ou indisponibilidade de dados deverá ser solucionada de boa-fé pelas Partes antes do fechamento mensal.',
        },
      ],
    },
  ];
}

function closingClauses() {
  return [
    {
      title: '9. CONFIDENCIALIDADE',
      blocks: [
        {
          type: 'p',
          text: '9.1. Cada Parte manterá confidenciais todas as informações estratégicas, comerciais, financeiras, técnicas, operacionais e de clientes recebidas da outra Parte, utilizando-as exclusivamente para a execução deste contrato.',
        },
        {
          type: 'p',
          text: '9.2. A obrigação de confidencialidade não se aplica a informações públicas, legitimamente conhecidas antes do recebimento, obtidas licitamente de terceiros ou cuja divulgação seja exigida por lei ou ordem de autoridade competente.',
        },
        {
          type: 'p',
          text: '9.3. A obrigação permanecerá vigente por 3 (três) anos após o término do contrato, sem prejuízo da proteção por prazo superior aplicável a segredos de negócio e dados pessoais.',
        },
      ],
    },
    {
      title: '10. PROTEÇÃO DE DADOS PESSOAIS',
      blocks: [
        {
          type: 'p',
          text: '10.1. As Partes comprometem-se a cumprir a legislação de proteção de dados pessoais, incluindo a Lei nº 13.709/2018 – Lei Geral de Proteção de Dados Pessoais (LGPD).',
        },
        {
          type: 'p',
          text: '10.2. Na medida em que a CONTRATADA tratar dados de leads, clientes ou usuários em nome da CONTRATANTE e segundo suas finalidades, a CONTRATANTE atuará como controladora e a CONTRATADA como operadora, sem prejuízo da qualificação jurídica decorrente das atividades efetivamente realizadas.',
        },
        {
          type: 'p',
          text: '10.3. A CONTRATADA tratará apenas os dados necessários à execução dos serviços, limitará o acesso às pessoas autorizadas, adotará medidas razoáveis de segurança e comunicará à CONTRATANTE, sem demora injustificada, eventual incidente relevante de que tenha conhecimento.',
        },
        {
          type: 'p',
          text: '10.4. A CONTRATANTE declara possuir base legal e cumprir os deveres de transparência relacionados à coleta, ao uso, ao compartilhamento e ao armazenamento dos dados disponibilizados à CONTRATADA, inclusive em pixels, formulários, CRM, listas de públicos e ferramentas de publicidade.',
        },
        {
          type: 'p',
          text: '10.5. Com o término do contrato, a CONTRATADA poderá eliminar ou devolver os dados pessoais recebidos, ressalvadas as hipóteses de retenção legal, defesa de direitos, registros técnicos e cópias de segurança sujeitas a ciclo regular de descarte.',
        },
      ],
    },
    {
      title: '11. TITULARIDADE DE CONTAS, DADOS E PROPRIEDADE INTELECTUAL',
      blocks: [
        {
          type: 'p',
          text: '11.1. Permanecem de titularidade da CONTRATANTE suas contas de anúncios, páginas, perfis, domínios, pixels, tags, bases de dados, CRM, BI, listas de clientes, materiais, marcas e demais ativos previamente existentes ou criados diretamente em seus ambientes.',
        },
        {
          type: 'p',
          text: '11.2. Permanecem de titularidade da CONTRATADA suas metodologias, processos, modelos, estruturas de campanha, templates, bibliotecas, dashboards, sistemas, ferramentas, códigos, automações, know-how, relatórios padronizados e materiais preexistentes, ainda que utilizados na execução do projeto.',
        },
        {
          type: 'p',
          text: '11.3. A CONTRATANTE poderá utilizar os relatórios e direcionamentos produzidos especificamente para sua operação durante a vigência. O acesso a sistemas próprios da CONTRATADA poderá ser encerrado com o término do contrato, sem que isso implique transferência de código, tecnologia ou propriedade intelectual.',
        },
        {
          type: 'p',
          text: '11.4. Os criativos e materiais produzidos pelo time interno ou por fornecedores da CONTRATANTE não serão de responsabilidade autoral ou técnica da CONTRATADA, ainda que tenham sido elaborados com base em seus briefings e direcionamentos.',
        },
      ],
    },
    {
      title: '12. RISCOS, LIMITAÇÕES E PLATAFORMAS DE TERCEIROS',
      blocks: [
        {
          type: 'p',
          text: '12.1. A performance depende de fatores que não estão sob controle exclusivo da CONTRATADA, incluindo preço, produto, oferta, concorrência, sazonalidade, verba, estoque, site, experiência de compra, atendimento comercial, velocidade de resposta, qualidade dos criativos, políticas de plataforma e comportamento do mercado.',
        },
        {
          type: 'p',
          text: '12.2. A CONTRATADA não será responsável por indisponibilidades, bloqueios, restrições, reprovações, falhas, alterações de algoritmo, perda de dados ou decisões tomadas por Meta, Google, provedores de hospedagem, ferramentas de analytics, CRM, BI ou outros terceiros, embora empregue esforços razoáveis para orientar a regularização.',
        },
        {
          type: 'p',
          text: '12.3. A CONTRATADA não responderá por informações falsas ou irregulares fornecidas pela CONTRATANTE, por promessas comerciais não cumpridas, infrações regulatórias, violação de direitos de terceiros, falhas de atendimento ou perdas decorrentes de indisponibilidade de produto, site, checkout, estoque ou equipe comercial.',
        },
        {
          type: 'p',
          text: '12.4. Nenhuma Parte será responsável por atraso ou inadimplemento decorrente de caso fortuito, força maior, ato de autoridade, indisponibilidade generalizada de serviços ou evento fora de seu controle razoável, enquanto perdurarem os efeitos do evento.',
        },
      ],
    },
    {
      title: '13. AUSÊNCIA DE VÍNCULO E AUTONOMIA DAS PARTES',
      blocks: [
        {
          type: 'p',
          text: '13.1. Este contrato não estabelece sociedade, associação, representação comercial, mandato geral, franquia, vínculo empregatício, exclusividade ou responsabilidade solidária entre as Partes.',
        },
        {
          type: 'p',
          text: '13.2. Cada Parte será exclusivamente responsável por seus empregados, prestadores, tributos, obrigações trabalhistas, previdenciárias, fiscais e comerciais.',
        },
      ],
    },
    {
      title: '14. COMUNICAÇÕES E ALTERAÇÕES',
      blocks: [
        {
          type: 'p',
          text: '14.1. Aprovações, alterações de orçamento, mudanças de escopo, solicitações e notificações poderão ser formalizadas por e-mail, plataforma de gestão, sistema de mensagens corporativo ou outro canal escrito adotado pelas Partes.',
        },
        {
          type: 'p',
          text: '14.2. Qualquer ampliação de canais, inclusão de produção criativa, implementação técnica, alteração do modelo de atribuição, mudança dos percentuais ou modificação relevante de escopo dependerá de aditivo ou aceite escrito entre as Partes.',
        },
        {
          type: 'p',
          text: '14.3. A eventual tolerância quanto ao descumprimento de obrigação será considerada mera liberalidade e não constituirá novação ou renúncia de direito.',
        },
        {
          type: 'p',
          text: '14.4. Se qualquer disposição for considerada inválida, as demais permanecerão vigentes, devendo as Partes substituir a disposição afetada por outra válida que preserve, na maior medida possível, sua finalidade econômica.',
        },
      ],
    },
    {
      title: '15. ASSINATURA ELETRÔNICA E FORO',
      blocks: [
        {
          type: 'p',
          text: '15.1. As Partes reconhecem como válidas as assinaturas eletrônicas apostas neste instrumento por plataforma aceita entre elas, bem como os respectivos registros de autenticação, autoria e integridade.',
        },
        {
          type: 'p',
          text: '15.2. O presente contrato obriga as Partes e seus sucessores e será regido pelas leis da República Federativa do Brasil.',
        },
        {
          type: 'p',
          text: '15.3. Fica eleito o foro da Comarca de Santo André, Estado de São Paulo, com renúncia a qualquer outro, por mais privilegiado que seja, para solucionar controvérsias decorrentes deste contrato, sem prejuízo de tentativa prévia de solução amigável.',
        },
      ],
    },
  ];
}

/**
 * Full structured legal document for rendering.
 */
export function buildLegalContractDocument(contract, settings, client) {
  const { brand, company, clientName } = partyContext(settings, client, contract);
  const meetingDays = Number(contract.meetingCadenceDays) || 15;
  const year = new Date().getFullYear();

  const providerRep =
    settings?.legalRepName || contract.acceptanceProviderName || '—';
  const clientRep =
    client?.legalRepName || contract.acceptanceClientName || clientName || '—';
  const clientRepDoc = client?.legalRepDocument
    ? `CPF nº ${client.legalRepDocument}`
    : '[CPF]';

  const preamble = `A CONTRATADA e a CONTRATANTE, em conjunto denominadas “Partes” e, individualmente, “Parte”, celebram o presente Instrumento Particular de Prestação de Serviços de Gestão de Tráfego Pago e Remuneração Contratual, mediante as cláusulas e condições seguintes.`;

  const clauses = [
    ...fixedClauses({ brand, company, clientName, meetingDays }),
    buildClause7(contract),
    buildClause8(contract),
    ...closingClauses(),
  ];

  return {
    title: LEGAL_INSTRUMENT_TITLE,
    subtitle: contract.subtitle || LEGAL_INSTRUMENT_SUBTITLE,
    projectLine: [
      contract.number ? `Projeto nº ${contract.number}` : null,
      contract.startDate ? `Início previsto: ${contract.startDate}` : null,
    ]
      .filter(Boolean)
      .join('  •  '),
    provider: {
      label: 'CONTRATADA',
      name: company,
      document: settings?.legalDocument
        ? `CNPJ nº ${settings.legalDocument}`
        : null,
      address: settings?.legalAddress || null,
      rep: providerRep,
      brandNote: `Nome comercial utilizado neste instrumento: ${brand}`,
    },
    clientParty: {
      label: 'CONTRATANTE',
      name: clientName,
      document: docLabel(client),
      address: formatClientAddress(client) || null,
      rep: `${clientRep}${client?.legalRepDocument ? '' : ` ${clientRepDoc}`}`,
      repDoc: client?.legalRepDocument ? clientRepDoc : null,
    },
    preamble,
    clauses,
    closing: {
      agreement:
        'E, por estarem de acordo, as Partes assinam o presente instrumento, juntamente com 2 (duas) testemunhas.',
      placeDate: `Santo André/SP, ____ de __________________ de ${year}.`,
      providerSignName: `${company.toUpperCase()} / ${brand.toUpperCase()}`,
      providerSignRole: 'CONTRATADA',
      providerSignPerson: providerRep,
      clientSignName: String(clientName).toUpperCase(),
      clientSignRole: 'CONTRATANTE',
      clientSignPerson: clientRep,
    },
  };
}
