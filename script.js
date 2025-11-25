// VARIÁVEIS GLOBAIS
let corpoHTML = '';
let citacaoHTML = '';
let referenciasHTML = '';
let notaHTML = '';
let fonteClasse = 'font-times'; // Padrão

// MARCADORES DE SEÇÃO INTUITIVOS (V9.5)
const MARCADOR_NOTA = '[NOTA_RODAPE]';
const DELIMITADOR_CITACAO = '```'; // Usando aspas simples triplas como delimitador de bloco

// VARIÁVEIS PARA NUMERAÇÃO E SUMÁRIO
let sumarioData = []; 
let n1Counter = 0;
let n2Counter = 0; 

// Função para formatar qualquer seção de texto, detectando títulos PELA CAPITALIZAÇÃO
function formatarTexto(texto, classe) {
    const itens = texto.split((classe === 'referencias') ? /\n/g : /\n{2,}/).filter(p => p.trim() !== '');
    let htmlFormatado = '';
    
    // Na classe 'corpo', iteramos linha a linha para detectar títulos
    const linhas = (classe === 'corpo' || classe === 'nota') ? texto.split('\n') : itens;

    linhas.forEach(linhaCompleta => {
        const linha = linhaCompleta.trim();
        if (linha === '') return;

        let conteudo = linha.replace(/\n/g, ' ').trim();
        let classeItem = '';
        let tag = 'p';

        if (classe === 'corpo') {
            
            // HEURÍSTICA DE TÍTULO: Curto (máx 50) E não termina com pontuação
            if (conteudo.length < 50 && !conteudo.match(/[.?!:;]$/)) {
                
                const isNivel1 = (conteudo === conteudo.toUpperCase() && conteudo !== conteudo.toLowerCase());
                const isNivel2 = !isNivel1; 
                
                if (isNivel1 || isNivel2) {
                    
                    classeItem = isNivel1 ? 'titulo-n1' : 'titulo-n2';
                    tag = 'div'; 

                    let numeroSecao = '';
                    let textoFormatado;
                    
                    if (isNivel1) {
                        n1Counter++;
                        n2Counter = 0; 
                        numeroSecao = `${n1Counter}`;
                        textoFormatado = conteudo.toUpperCase(); 
                    } else { 
                        n2Counter++;
                        numeroSecao = `${n1Counter}.${n2Counter}`;
                        textoFormatado = conteudo.charAt(0).toUpperCase() + conteudo.slice(1);
                    }
                    
                    // Adiciona ao Sumário
                    sumarioData.push({
                        numero: numeroSecao,
                        titulo: textoFormatado,
                        nivel: isNivel1 ? 1 : 2
                    });

                    // Insere a numeração no conteúdo do título
                    htmlFormatado += `<${tag} class="${classeItem}">${numeroSecao} ${textoFormatado}</${tag}>`;
                    return; 
                }
            }
            
            classeItem = 'corpo';
            // V9.4/V9.5: Se o conteúdo começar com o bloco DIV da citação, insere o HTML direto
            if (conteudo.startsWith('<div class="citacao">')) {
                 htmlFormatado += conteudo; 
            } else {
                 htmlFormatado += `<p class="${classeItem}">${conteudo}</p>`;
            }
            return; 
        } else if (classe === 'citacao') {
            // Formata o bloco de citação (retorna um bloco DIV formatado para ser recolocado no corpo)
            classeItem = 'citacao';
            // Garante que o bloco de citação seja um único DIV, contendo parágrafos internos
            return `<div class="${classeItem}">${conteudo.split('\n').filter(l => l.trim() !== '').map(p => `<p>${p.trim()}</p>`).join('')}</div>`;

        } else if (classe === 'referencias') {
            classeItem = 'referencias';
            htmlFormatado += `<p class="${classeItem}">${conteudo}</p>`;
        } else if (classe === 'nota') {
            classeItem = 'nota-section'; 
            htmlFormatado += `<p class="${classeItem}">${conteudo}</p>`;
        }
    });
    
    return htmlFormatado;
}


function aplicarABNT() {
    // RESET GERAL DE DADOS
    sumarioData = [];
    n1Counter = 0;
    n2Counter = 0;

    // 1. Mostrar o Loader
    document.getElementById('loading-overlay').style.display = 'flex'; 
    const placeholder = document.querySelector('.placeholder-text');
    if (placeholder) placeholder.style.display = 'none';

    setTimeout(() => {
        // 2. Coleta a fonte
        const seletorFonte = document.getElementById('seletorFonte').value;
        fonteClasse = (seletorFonte === 'arial') ? 'font-arial' : 'font-times';
        
        // 3. Coleta o CONTEÚDO PRINCIPAL
        let corpoText = document.getElementById('textoPrincipal').value;
        const ref = document.getElementById('textoReferencias').value;
        let notaText = '';
        
        // --- 3a. Separar e Formatar NOTAS DE RODAPÉ ---
        if (corpoText.includes(MARCADOR_NOTA)) {
            const partesNota = corpoText.split(MARCADOR_NOTA);
            corpoText = partesNota[0]; 
            notaText = partesNota[1] || ''; 
        }
        
        // --- 3b. Separar, Formatar e Recolocar Citação Longa (V9.5) ---
        let citacaoFormatada = '';
        
        // Detecta o bloco entre os delimitadores triplos
        const indices = [...corpoText.matchAll(new RegExp(DELIMITADOR_CITACAO, 'g'))].map(a => a.index);
        
        if (indices.length >= 2) {
            const inicio = indices[0];
            const fim = indices[1] + DELIMITADOR_CITACAO.length; // O final deve incluir o delimitador

            const blocoCitacaoCru = corpoText.substring(inicio + DELIMITADOR_CITACAO.length, indices[1]).trim();
            
            // 1. Formata a citação (retorna um bloco DIV formatado)
            citacaoFormatada = formatarTexto(blocoCitacaoCru, 'citacao');

            // 2. Cria o novo conteúdo do corpo, substituindo o bloco cru + delimitadores pelo bloco formatado
            const antes = corpoText.substring(0, inicio);
            const depois = corpoText.substring(fim);

            // Substitui o bloco de texto cru pelo bloco HTML formatado da citação
            corpoText = antes + '\n\n' + citacaoFormatada + '\n\n' + depois;
        }

        // 4. Formata o CORPO e a NOTA (numeração é feita no corpo)
        corpoHTML = formatarTexto(corpoText, 'corpo');
        notaHTML = formatarTexto(notaText, 'nota');
        referenciasHTML = formatarTexto(ref, 'referencias');

        // 5. Monta o documento final com as páginas
        gerarDocumentoComPaginacao();
        
        // 6. Esconder o Loader
        document.getElementById('loading-overlay').style.display = 'none'; 

        alert('Documento ABNT gerado com sucesso (V9.5)!');
    }, 100); 
}

function gerarDocumentoComPaginacao() {
    const documentView = document.getElementById('document-view');
    documentView.innerHTML = ''; 
    
    // 1. GERAR PÁGINA DO SUMÁRIO
    let sumarioHTML = `<div class="titulo-n1" style="text-align: center; margin-top: 0; margin-bottom: 2rem;">SUMÁRIO</div>`;
    
    // Adiciona o Título da Referência ao sumário manualmente
    sumarioData.push({
        numero: `${n1Counter + 1}`,
        titulo: 'REFERÊNCIAS',
        nivel: 1
    });

    sumarioData.forEach(item => {
        const indent = item.nivel === 1 ? '0' : '20px'; 
        const style = item.nivel === 1 ? 'font-weight: bold; text-transform: uppercase;' : 'font-weight: normal;';
        sumarioHTML += `<p class="sumario-item" style="margin-left: ${indent}; ${style}">${item.numero} ${item.titulo}</p>`;
    });
    
    sumarioData.pop(); 

    let pageSumario = document.createElement('div');
    pageSumario.className = `abnt-page ${fonteClasse}`;
    pageSumario.innerHTML = sumarioHTML;
    documentView.appendChild(pageSumario);
    
    // --- 2. PÁGINA 1: CONTEÚDO PRINCIPAL (e subsequentes) ---
    let page1 = document.createElement('div');
    page1.className = `abnt-page ${fonteClasse}`;
    page1.innerHTML = corpoHTML;
    documentView.appendChild(page1);

    // --- 3. PÁGINA DE REFERÊNCIAS E NOTAS ---
    let page2 = document.createElement('div');
    page2.className = `abnt-page ${fonteClasse}`;
    
    const numeroReferencias = n1Counter + 1;
    
    page2.innerHTML += `<div class="titulo-n1" style="text-align: center; margin-top: 0;">${numeroReferencias} REFERÊNCIAS</div>`;
    page2.innerHTML += referenciasHTML;
    
    if (notaHTML) {
        page2.innerHTML += `<hr style="margin: 20px 0; border-top: 1px dashed #999;">`;
        page2.innerHTML += `<div class="nota-section">${notaHTML}</div>`;
    }
    
    documentView.appendChild(page2);
}


// As funções copiarDocumento e downloadDocumento não foram alteradas.
function copiarDocumento() {
    // ... (código da função copiarDocumento) ...
}

function downloadDocumento() {
    // ... (código da função downloadDocumento) ...
}