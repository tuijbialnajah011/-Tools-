export const autoFormatToMarkdown = (text: string): string => {
  if (/^## /m.test(text)) {
    return text;
  }

  // Clean up common PDF extraction artifacts
  let cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/ n /g, '\n- ') // Fix 'n' bullet points often found in PDFs
    .replace(/•/g, '\n- ')
    .replace(/(\w)-\n(\w)/g, '$1$2') // Fix hyphenated line breaks
    .replace(/([a-z,;])\n([a-z])/gi, '$1 $2'); // Join lines that break mid-sentence

  const paragraphs = cleanText.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
  
  let formattedText = '';
  let sectionCount = 0;
  let cardCount = 0;

  // If text is just one giant block, split it artificially
  if (paragraphs.length < 3) {
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    formattedText += `\n\n## Document Overview\n\n`;
    let currentChunk = '';
    let chunkIdx = 1;
    
    for (let i = 0; i < sentences.length; i++) {
      currentChunk += sentences[i].trim() + ' ';
      if (currentChunk.length > 300 || i === sentences.length - 1) {
        if (chunkIdx === 1) {
          formattedText += `${currentChunk}\n\n`;
        } else {
          formattedText += `\n\n### Part ${chunkIdx}\n\n${currentChunk}\n\n`;
        }
        currentChunk = '';
        chunkIdx++;
      }
    }
    return formattedText;
  }

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    
    const isShort = p.length > 2 && p.length < 100;
    const isCapitalized = p === p.toUpperCase() && p.match(/[A-Z]/);
    const hasNoPunctuationAtEnd = !/[.!?]$/.test(p);
    
    // Heuristic for heading
    const isHeading = isShort && (isCapitalized || hasNoPunctuationAtEnd);

    if (isHeading) {
      const cleanHeading = p.replace(/[:.]$/, '').trim();
      // Promote to H2 if it's ALL CAPS or we don't have a section yet
      if (isCapitalized || sectionCount === 0 || cardCount > 3) {
        formattedText += `\n\n## ${cleanHeading}\n\n`;
        sectionCount++;
        cardCount = 0;
      } else {
        formattedText += `\n\n### ${cleanHeading}\n\n`;
        cardCount++;
      }
    } else {
      // Process paragraph content
      let processedP = p;
      
      // Detect inline definitions
      if (p.includes(':') && p.split(':')[0].length < 40 && !p.includes('\n')) {
        const parts = p.split(':');
        processedP = `**${parts[0].trim()}**: ${parts.slice(1).join(':').trim()}`;
      }
      
      if (i === 0 && sectionCount === 0) {
        formattedText += `\n\n## Introduction\n\n${processedP}\n\n`;
        sectionCount++;
      } else {
        // Create artificial cards for long paragraphs to make it look cinematic
        if (processedP.length > 300 && sectionCount > 0 && !processedP.includes('\n- ')) {
           const sentences = processedP.match(/[^.!?]+[.!?]+/g) || [processedP];
           let currentChunk = '';
           for (let j = 0; j < sentences.length; j++) {
             currentChunk += sentences[j].trim() + ' ';
             if (currentChunk.length > 200 || j === sentences.length - 1) {
               formattedText += `\n\n### Key Point ${cardCount + 1}\n\n${currentChunk}\n\n`;
               currentChunk = '';
               cardCount++;
             }
           }
        } else if (processedP.length > 100 && sectionCount > 0) {
           formattedText += `\n\n### Key Point ${cardCount + 1}\n\n${processedP}\n\n`;
           cardCount++;
        } else {
           formattedText += `${processedP}\n\n`;
        }
      }
    }
  }

  return formattedText;
};

export const generateCinematicHTML = (title: string, markdown: string, themeIndex?: number, passedInteractiveData?: any) => {
  // Extract interactive JSON if present
  let interactiveData = passedInteractiveData;
  if (!interactiveData) {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = markdown.match(jsonRegex);
    if (match && match[1]) {
      try {
        interactiveData = JSON.parse(match[1]);
        markdown = markdown.replace(jsonRegex, '').trim();
      } catch (e) {
        console.error("Failed to parse interactive JSON in cinematic generator", e);
      }
    }
  }

  const sections = markdown.split(/^## /m).filter(s => s.trim());
  const heroTitle = title.replace('.pdf', '');
  
  const themes = [
    {
      name: 'Editorial',
      colors: {
        ink: '#1c1c1c',
        paper: '#f9f8f6',
        accent: '#b84b31',
        accent2: '#d4a373',
        border: '#e8e6e1',
        card: '#ffffff',
        coverText: '#1c1c1c',
        coverBg: '#f9f8f6'
      },
      bgType: 'particles',
      bgColor: 0x1c1c1c
    },
    {
      name: 'Obsidian',
      colors: {
        ink: '#f0f0f0',
        paper: '#0a0a0a',
        accent: '#e0e0e0',
        accent2: '#888888',
        border: '#1f1f1f',
        card: '#121212',
        coverText: '#ffffff',
        coverBg: '#050505'
      },
      bgType: 'particles',
      bgColor: 0x333333
    },
    {
      name: 'Sage',
      colors: {
        ink: '#1e2b22',
        paper: '#f1f4f2',
        accent: '#4a6b53',
        accent2: '#8a9a86',
        border: '#dce3de',
        card: '#ffffff',
        coverText: '#1e2b22',
        coverBg: '#e6ece8'
      },
      bgType: 'waves',
      bgColor: 0x4a6b53
    },
    {
      name: 'Monochrome',
      colors: {
        ink: '#000000',
        paper: '#ffffff',
        accent: '#000000',
        accent2: '#666666',
        border: '#e0e0e0',
        card: '#ffffff',
        coverText: '#000000',
        coverBg: '#f5f5f5'
      },
      bgType: 'grid',
      bgColor: 0x000000
    },
    {
      name: 'Gallery',
      colors: {
        ink: '#2d3748',
        paper: '#ffffff',
        accent: '#3182ce',
        accent2: '#90cdf4',
        border: '#edf2f7',
        card: '#f7fafc',
        coverText: '#2b6cb0',
        coverBg: '#ebf8ff'
      },
      bgType: 'spheres',
      bgColor: 0x3182ce
    },
    {
      name: 'Sepia',
      colors: {
        ink: '#433422',
        paper: '#fdfbf7',
        accent: '#c08447',
        accent2: '#e6ccb2',
        border: '#f0e6d2',
        card: '#ffffff',
        coverText: '#433422',
        coverBg: '#f5ebd9'
      },
      bgType: 'particles',
      bgColor: 0xc08447
    },
    {
      name: 'Midnight',
      colors: {
        ink: '#e2e8f0',
        paper: '#0f172a',
        accent: '#38bdf8',
        accent2: '#818cf8',
        border: '#1e293b',
        card: '#1e293b',
        coverText: '#f8fafc',
        coverBg: '#020617'
      },
      bgType: 'torus',
      bgColor: 0x38bdf8
    },
    {
      name: 'High Contrast',
      colors: {
        ink: '#000000',
        paper: '#ffffff',
        accent: '#000000',
        accent2: '#000000',
        border: '#000000',
        card: '#ffffff',
        coverText: '#ffffff',
        coverBg: '#000000'
      },
      bgType: 'grid',
      bgColor: 0x000000
    }
  ];

  const theme = (themeIndex !== undefined && themeIndex >= 0 && themeIndex < themes.length) 
    ? themes[themeIndex] 
    : themes[Math.floor(Math.random() * themes.length)];
  
  const sectionHTML = sections.map((section, index) => {
    const lines = section.split('\n');
    const sectionTitle = lines[0].trim();
    const content = lines.slice(1).join('\n');
    
    const subSections = content.split(/^### /m);
    const introContent = subSections[0].trim();
    const processMarkdown = (text: string) => {
      return text
        .replace(/^\> (.*$)/gim, '<div class="note-box info gsap-up"><span class="note-icon">ℹ️</span><div>$1</div></div>')
        .replace(/\*\*(.*?)\*\*: (.*$)/gim, '<div class="def-box gsap-scale"><div class="def-label">Definition</div><div class="def-term">$1</div><div class="def-text">$2</div></div>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/(?:<li>.*<\/li>\n?)+/g, match => `<ul class="gsap-up">${match}</ul>`)
        .replace(/^([ \t]*\|.*\|[ \t]*)\n([ \t]*\|[:\-\s|]*\|[ \t]*)\n((?:[ \t]*\|.*\|[ \t]*\n?)*)/gm, (match, header, separator, rows) => {
          const headerCols = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
          const bodyRows = rows.split('\n').filter((r: string) => r.trim()).map((row: string) => {
            const cols = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
            return `<tr>${cols}</tr>`;
          }).join('');
          return `<div class="table-container gsap-up"><table class="cinematic-table"><thead><tr>${headerCols}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
        });
    };

    const cards = subSections.slice(1).map(sub => {
      const subLines = sub.split('\n');
      const subTitle = subLines[0].trim();
      const subBody = processMarkdown(subLines.slice(1).join('\n'));
      
      if (subTitle.includes('🔄 FLOW:')) {
        const flowTitle = subTitle.replace('🔄 FLOW:', '').trim();
        
        // Extract steps from list items
        const steps = subBody.match(/<li>(.*?)<\/li>/g)?.map(li => li.replace(/<\/?li>/g, '')) || [];
        
        return `
          <div class="flow-container gsap-up">
            <h3 class="flow-title">${flowTitle}</h3>
            <div class="flow-steps">
              ${steps.map((step, i) => `
                <div class="flow-step">
                  <div class="flow-step-number">${i + 1}</div>
                  <div class="flow-step-content">${step}</div>
                </div>
                ${i < steps.length - 1 ? `<div class="flow-arrow">↓</div>` : ''}
              `).join('')}
            </div>
          </div>
        `;
      }

      if (subTitle.includes('🎨 VISUAL:')) {
        const visualTitle = subTitle.replace('🎨 VISUAL:', '').trim();
        const content = subLines.slice(1).join('\n');
        
        const emojiMatch = content.match(/- EMOJI:\s*(.*)/);
        const emoji = emojiMatch ? emojiMatch[1].trim() : '✨';
        
        const items = content.match(/- ITEM:\s*(.*?)\s*\|\s*(.*)/g)?.map(item => {
          const parts = item.match(/- ITEM:\s*(.*?)\s*\|\s*(.*)/);
          return {
            icon: parts ? parts[1].trim() : 'sparkles',
            text: parts ? parts[2].trim() : ''
          };
        }) || [];

        const iconMap: Record<string, string> = {
          'sparkles': '✨',
          'info': 'ℹ️',
          'check': '✅',
          'zap': '⚡',
          'star': '⭐',
          'target': '🎯',
        };

        return `
          <div class="visual-card card gsap-up">
            <div class="visual-card-header">
              <div class="visual-card-emoji">${emoji}</div>
              <h3 class="visual-card-title">${visualTitle}</h3>
            </div>
            <div class="visual-card-grid">
              ${items.map(item => `
                <div class="visual-card-item">
                  <div class="visual-card-item-icon">${iconMap[item.icon] || '✨'}</div>
                  <div class="visual-card-item-text">${item.text}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      return `
        <div class="card-wrapper">
          <div class="card gsap-up">
            <div class="card-accent-line"></div>
            <div class="card-header">
              <h3>${subTitle}</h3>
            </div>
            <div class="card-body">${subBody}</div>
          </div>
        </div>
      `;
    }).join('');

    const processedIntro = processMarkdown(introContent);

    return `
      <section class="section" id="section-${index}">
        <div class="section-parallax-bg" data-speed="-0.1"></div>
        <div class="section-content">
          <div class="section-label gsap-left">${String(index + 1).padStart(2, '0')} — Section</div>
          <h2 class="section-title gsap-up">${sectionTitle}</h2>
          <div class="gsap-reveal">
            ${processedIntro}
            <div class="cards-grid">
              ${cards}
            </div>
          </div>
        </div>
      </section>
    `;
  }).join('');

  const tocHTML = sections.map((section, index) => {
    const sectionTitle = section.split('\n')[0].trim();
    return `<a class="toc-item" href="#section-${index}"><span class="toc-dot"></span>${sectionTitle}</a>`;
  }).join('');

  // Build interactive HTML if data exists
  let interactiveHTML = '';
  if (interactiveData) {
    interactiveHTML += `<section class="section">
      <div class="section-label">Interactive</div>
      <h2 class="section-title gsap-up">Knowledge Check</h2>
      <div class="interactive-container gsap-up">`;

    // Match the Following
    if (interactiveData.matching && interactiveData.matching.length > 0) {
      interactiveHTML += `
        <div class="match-game card gsap-up" id="match-game">
          <svg class="match-svg" id="match-svg"></svg>
          <h3 style="text-align:center; font-family:'Playfair Display',serif; margin-bottom: 40px; font-style: italic;">Match the Following</h3>
          <div style="display:flex; gap:60px; justify-content:center; position: relative; z-index: 1;">
            <div class="match-col" id="match-left" style="flex: 1;">
              ${interactiveData.matching.map((m: any, i: number) => `<button class="match-btn left-btn" data-id="${i}">${m.left}</button>`).join('')}
            </div>
            <div class="match-col" id="match-right" style="flex: 1;">
              ${[...interactiveData.matching].sort(() => Math.random() - 0.5).map((m: any) => `<button class="match-btn right-btn" data-match="${interactiveData.matching.findIndex((orig: any) => orig.right === m.right)}">${m.right}</button>`).join('')}
            </div>
          </div>
          <div id="match-success" style="display:none; text-align:center; color: var(--accent); margin-top:30px; font-weight:bold; font-size: 20px;">✨ Perfect Match! All pairs found.</div>
        </div>
      `;
    }

    // MCQs
    if (interactiveData.mcqs && interactiveData.mcqs.length > 0) {
      interactiveHTML += `<div class="mcq-container" style="margin-top: 60px;">`;
      interactiveData.mcqs.forEach((mcq: any, qIdx: number) => {
        interactiveHTML += `
          <div class="mcq-card card gsap-up" id="mcq-${qIdx}">
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
              <h3 style="font-size:18px; font-family:sans-serif; font-style:normal;">${qIdx + 1}. ${mcq.question}</h3>
              <span style="font-size:10px; text-transform:uppercase; padding:4px 8px; border:1px solid var(--border); border-radius:12px;">${mcq.difficulty}</span>
            </div>
            <div class="mcq-options">
              ${mcq.options.map((opt: string, oIdx: number) => `
                <button class="mcq-opt-btn" onclick="checkAnswer(${qIdx}, ${oIdx}, ${mcq.answerIndex}, this, '${mcq.explanation.replace(/'/g, "\\'")}')">${opt}</button>
              `).join('')}
            </div>
            <div class="mcq-explanation" id="exp-${qIdx}" style="display:none; margin-top:15px; padding:15px; background:var(--glass); border-left:2px solid var(--accent); font-size:14px;"></div>
          </div>
        `;
      });
      interactiveHTML += `</div>`;
    }

    // Flashcards
    if (interactiveData.flashcards && interactiveData.flashcards.length > 0) {
      interactiveHTML += `
        <div class="flashcards-section gsap-up" style="margin-top: 80px;">
          <h3 style="text-align:center; font-family:'Playfair Display',serif; margin-bottom: 40px; font-style: italic;">Active Recall Flashcards</h3>
          <div class="flashcard-container" onclick="this.querySelector('.flashcard').classList.toggle('flipped')">
            <div class="flashcard">
              <div class="flashcard-front">
                <div class="flashcard-content">
                  <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; opacity: 0.6;">Question</div>
                  <div id="flashcard-question" style="font-size: 24px; font-weight: 500;">${interactiveData.flashcards[0].term}</div>
                </div>
              </div>
              <div class="flashcard-back">
                <div class="flashcard-content">
                  <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; opacity: 0.8;">Answer</div>
                  <div id="flashcard-answer" style="font-size: 20px; line-height: 1.6;">${interactiveData.flashcards[0].definition}</div>
                </div>
              </div>
            </div>
          </div>
          <div style="display:flex; justify-content:center; gap:20px; margin-top:30px;">
            <button onclick="prevFlashcard()" class="match-btn" style="width:auto; padding:10px 20px;">Previous</button>
            <div id="flashcard-counter" style="display:flex; align-items:center; font-family:monospace; font-size:14px;">1 / ${interactiveData.flashcards.length}</div>
            <button onclick="nextFlashcard()" class="match-btn" style="width:auto; padding:10px 20px;">Next</button>
          </div>
        </div>
      `;
    }

    // Mind Map
    if (interactiveData.mindMap && interactiveData.mindMap.nodes && interactiveData.mindMap.nodes.length > 0) {
      interactiveHTML += `
        <div class="mindmap-section gsap-up" style="margin-top: 80px;">
          <h3 style="text-align:center; font-family:'Playfair Display',serif; margin-bottom: 40px; font-style: italic;">Concept Mind Map</h3>
          <div class="mindmap-container" id="mindmap-container">
            <svg class="mindmap-svg" id="mindmap-svg" viewBox="0 0 800 600"></svg>
          </div>
        </div>
      `;
    }

    interactiveHTML += `</div></section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${heroTitle} — Cinematic Study Experience</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<style>
:root {
  --ink:    ${theme.colors.ink};
  --paper:  ${theme.colors.paper};
  --accent: ${theme.colors.accent};
  --accent2:${theme.colors.accent2};
  --border: ${theme.colors.border};
  --card:   ${theme.colors.card};
  --cover-text: ${theme.colors.coverText};
  --cover-bg: ${theme.colors.coverBg};
  --glass: rgba(255, 255, 255, 0.03);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{overflow-x:hidden;width:100%;}
body{font-family:'Inter',sans-serif;background:var(--paper);color:var(--ink);font-size:17px;line-height:1.8;overflow-x:hidden;width:100%;-webkit-font-smoothing:antialiased;}

.noise { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 9999; opacity: 0.04; background: url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E'); }

/* Table Styles */
.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 60px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  width: 100%;
  max-width: 100%;
  display: block;
  position: relative;
}
.cinematic-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  text-align: left;
  min-width: 800px;
}
.cinematic-table th {
  color: var(--ink);
  padding: 24px 20px;
  font-family: 'DM Mono', monospace;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 2px;
  font-weight: 500;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.cinematic-table td {
  padding: 20px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  color: var(--ink);
  font-weight: 400;
  min-width: 120px;
}
.cinematic-table tr:last-child td {
  border-bottom: none;
}

#webgl-bg{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0.15;}

/* Progress Bar */
#progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 0%;
  height: 2px;
  background: var(--accent);
  z-index: 1000;
  transition: width 0.1s;
}

.cover{min-height:100vh;background:var(--cover-bg);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:40px 20px;}
.cover-title{font-family:'Playfair Display',serif;font-size:clamp(48px,10vw,120px);font-weight:400;font-style:italic;color:var(--cover-text);text-align:center;line-height:1.1;letter-spacing:-1px;z-index:2;word-break:break-word;}
.cover-subtitle{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.6);text-align:center;margin-top:40px;z-index:2;}

.toc-strip{position:sticky;top:0;z-index:100;background:var(--paper);border-bottom:1px solid var(--border);display:flex;justify-content:center;overflow-x:auto;padding:0 20px;scrollbar-width:none; transition: all 0.3s;}
.toc-strip::-webkit-scrollbar{display:none;}
.toc-item{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink);opacity:0.5;padding:20px 16px;white-space:nowrap;text-decoration:none;transition: all 0.3s;}
.toc-item.active{opacity:1;border-bottom:2px solid var(--accent);}
.toc-item:hover{opacity:0.8;}

.main{max-width:900px;margin:0 auto;padding:100px 20px;position:relative;z-index:2;}

.section{margin-bottom:200px;position:relative;scroll-margin-top:100px;}
.section-parallax-bg {
  position: absolute;
  top: 0;
  left: -20%;
  width: 140%;
  height: 120%;
  background: radial-gradient(circle at center, var(--accent) 0%, transparent 60%);
  opacity: 0.02;
  z-index: -1;
  pointer-events: none;
  filter: blur(40px);
}

.section-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--accent);margin-bottom:24px;display:flex;align-items:center;gap:16px;justify-content:center;}
.section-label::before, .section-label::after{content:'';width:40px;height:1px;background:var(--accent);opacity:0.3;}
.section-title{font-family:'Playfair Display',serif;font-size:clamp(36px,6vw,64px);font-weight:400;margin-bottom:80px;line-height:1.1;text-align:center;word-break:break-word;}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 60px;
  margin-top: 60px;
}

.card-wrapper { perspective: 1000px; min-width: 0; }
.card{background:color-mix(in srgb, var(--card) 85%, transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid color-mix(in srgb, var(--border) 60%, transparent);border-radius:24px;padding:48px;position:relative;width:100%;min-width:0;transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);box-shadow: 0 10px 40px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.05);}
.card:hover{transform: translateY(-5px); border-color: var(--accent); box-shadow: 0 20px 50px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1);}

.card-header { margin-bottom: 24px; }
.card h3{font-family:'Playfair Display',serif;font-size:28px;line-height:1.3;color:var(--ink);font-weight: 400;font-style:italic;}

.card-body{font-size:17px;color:var(--ink);font-weight: 400; line-height: 1.8; opacity: 0.9;}

.flow-container { margin: 60px 0; padding: 48px; background: color-mix(in srgb, var(--card) 85%, transparent); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid color-mix(in srgb, var(--border) 60%, transparent); border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.05); }
.flow-title { font-family: 'Playfair Display', serif; font-size: 24px; text-align: center; margin-bottom: 40px; color: var(--ink); font-style: italic; }
.flow-steps { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.flow-step { display: flex; align-items: center; gap: 20px; background: transparent; border: 1px solid var(--accent); padding: 20px 30px; border-radius: 12px; width: 100%; max-width: 500px; transition: all 0.3s; }
.flow-step:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); background: var(--glass); }
.flow-step-number { width: 40px; height: 40px; border-radius: 50%; background: var(--accent); color: var(--paper); display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-weight: bold; font-size: 18px; flex-shrink: 0; }
.flow-step-content { font-size: 16px; color: var(--ink); line-height: 1.6; }
.flow-arrow { color: var(--accent); font-size: 24px; font-weight: bold; opacity: 0.5; }

/* Visual Card Styling */
.visual-card {
  padding: 48px !important;
  margin: 60px 0;
  border-radius: 40px !important;
  background: color-mix(in srgb, var(--card) 85%, transparent) !important;
  backdrop-filter: blur(16px);
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent) !important;
  position: relative;
  overflow: hidden;
}
.visual-card-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
}
.visual-card-emoji {
  width: 56px;
  height: 56px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}
.visual-card-title {
  font-family: 'Playfair Display', serif !important;
  font-size: 28px !important;
  font-style: italic !important;
  margin: 0 !important;
  color: var(--ink) !important;
}
.visual-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}
.visual-card-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: color-mix(in srgb, var(--paper) 40%, transparent);
  border-radius: 20px;
  border: 1px solid var(--border);
  transition: transform 0.3s ease;
}
.visual-card-item:hover {
  transform: translateX(5px);
}
.visual-card-item-icon {
  font-size: 20px;
  margin-top: 3px;
}
.visual-card-item-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink);
  opacity: 0.85;
  font-weight: 500;
}

/* Flashcards */
.flashcard-container { perspective: 1000px; margin: 60px 0; }
.flashcard { position: relative; width: 100%; height: 300px; transition: transform 0.6s; transform-style: preserve-3d; cursor: pointer; }
.flashcard.flipped { transform: rotateY(180deg); }
.flashcard-front, .flashcard-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; padding: 40px; text-align: center; border-radius: 24px; border: 1px solid var(--border); background: var(--card); backdrop-filter: blur(10px); }
.flashcard-back { transform: rotateY(180deg); background: var(--accent); color: var(--paper); }
.flashcard-content { display: flex; flex-direction: column; align-items: center; justify-content: center; }

/* Mind Map */
.mindmap-container { position: relative; width: 100%; aspect-ratio: 4/3; background: var(--glass); border-radius: 24px; border: 1px solid var(--border); overflow: hidden; margin: 60px 0; }
.mindmap-svg { width: 100%; height: 100%; }
.mindmap-node { fill: var(--paper); stroke: var(--accent); stroke-width: 2; }
.mindmap-node.root { fill: var(--accent); }
.mindmap-label { font-size: 10px; fill: var(--ink); font-family: 'DM Mono', monospace; pointer-events: none; font-weight: bold; }
.mindmap-label.root { fill: var(--paper); }
.mindmap-edge { stroke: var(--accent); stroke-width: 1; stroke-dasharray: 5,5; opacity: 0.3; }

/* Pomodoro Timer */
.pomodoro-widget {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: color-mix(in srgb, var(--card) 85%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 150px;
  transition: transform 0.3s ease;
}
.pomodoro-widget:hover {
  transform: translateY(-5px);
}
.pomodoro-time {
  font-family: 'DM Mono', monospace;
  font-size: 32px;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 2px;
}
.pomodoro-controls {
  display: flex;
  gap: 10px;
}
.pomodoro-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--ink);
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s;
}
.pomodoro-btn:hover {
  border-color: var(--accent);
  background: var(--glass);
}
.pomodoro-status {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--accent);
  font-weight: 600;
}

.card-accent-line{display:none;}

.note-box{padding:32px 40px;margin:60px 0;background:transparent;border:1px solid var(--border);font-size:18px;font-family:'Playfair Display',serif;font-style:italic;color:var(--ink);text-align:center;position:relative;}
.note-box::before{content:'"';font-size:60px;position:absolute;top:-20px;left:20px;color:var(--accent);opacity:0.2;font-family:serif;}

.def-box{margin:60px 0;padding-left:32px;border-left:2px solid var(--accent);background:transparent;}
.def-label{font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;color:var(--accent);margin-bottom:16px;letter-spacing:3px;}
.def-term{font-family:'Playfair Display',serif;font-size:32px;font-weight:400;margin-bottom:16px; color: var(--ink);}
.def-text{font-size:16px; color: var(--ink); line-height: 1.8; font-weight: 300; opacity: 0.8;}

.match-game { position: relative; overflow: visible !important; }
.match-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.match-line { stroke: var(--accent); stroke-width: 2; stroke-dasharray: 5,5; opacity: 0.6; stroke-linecap: round; }
.match-btn { display:block; width:100%; padding:15px; margin-bottom:10px; background:transparent; border:1px solid var(--border); color:var(--ink); cursor:pointer; transition:all 0.3s; border-radius:8px; text-align:left; position: relative; z-index: 1; }
.match-btn:hover { border-color:var(--accent); transform: translateX(5px); }
.match-btn.right-btn:hover { transform: translateX(-5px); }
.match-btn.selected { background:var(--glass); border-color:var(--accent); box-shadow: 0 0 15px var(--accent); }
.match-btn.matched { opacity:0.5; cursor:not-allowed; border-color:green; }
.match-btn.error { border-color:red; animation: shake 0.5s; }

.mcq-opt-btn { display:block; width:100%; padding:15px; margin-bottom:10px; background:transparent; border:1px solid var(--border); color:var(--ink); cursor:pointer; transition:all 0.3s; border-radius:8px; text-align:left; }
.mcq-opt-btn:hover:not(:disabled) { border-color:var(--accent); background:var(--glass); }
.mcq-opt-btn.correct { border-color:green; background:rgba(0,128,0,0.1); }
.mcq-opt-btn.wrong { border-color:red; background:rgba(255,0,0,0.1); }
.mcq-opt-btn:disabled { cursor:not-allowed; }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

ul { padding-left: 0; margin: 32px 0; list-style-type: none; }
li { position: relative; margin-bottom: 16px; padding-left: 24px; font-weight: 300; }
li::before { content: ''; position: absolute; left: 0; top: 12px; width: 6px; height: 1px; background: var(--accent); }

.gsap-reveal, .gsap-up, .gsap-scale, .gsap-left { 
  opacity: 0; 
  visibility: hidden; 
  will-change: transform, opacity;
}
.card {
  will-change: transform;
}

@media (min-width: 768px) {
  .main{padding:100px 32px;}
  .section{margin-bottom:200px;}
  .cover{padding:80px 40px;}
}

/* Theme Specific Tweaks */
${theme.name === 'Cyberpunk' ? `
  .card { border: 1px solid var(--accent); box-shadow: 0 0 20px rgba(255, 0, 255, 0.1); }
  .cover-title { text-shadow: 0 0 30px var(--accent); }
` : ''}

${theme.name === 'Midnight Neon' ? `
  .card { background: #1e293b; border-color: #334155; }
  .note-box { background: #0f172a; border-color: var(--accent); }
` : ''}

</style>
</head>
<body>
<div class="noise"></div>
<div id="progress-bar"></div>
<canvas id="webgl-bg"></canvas>

<section class="cover">
  <h1 class="cover-title">${heroTitle}</h1>
  <p class="cover-subtitle">Powered by 𝙱𝙹𝙴 ~ Clan — Theme: ${theme.name}</p>
</section>

<nav class="toc-strip">${tocHTML}</nav>

<main class="main">
  ${sectionHTML}
  ${interactiveHTML}
</main>

<div class="pomodoro-widget" id="pomodoro">
  <div class="pomodoro-status" id="pomodoro-status">Study Time</div>
  <div class="pomodoro-time" id="pomodoro-time">25:00</div>
  <div class="pomodoro-controls">
    <button class="pomodoro-btn" id="pomodoro-start">Start</button>
    <button class="pomodoro-btn" id="pomodoro-reset">Reset</button>
  </div>
</div>

<script>
// Pomodoro Timer Logic
let pomodoroInterval;
let timeLeft = 25 * 60;
let isRunning = false;
let isStudyMode = true;

const timeDisplay = document.getElementById('pomodoro-time');
const statusDisplay = document.getElementById('pomodoro-status');
const startBtn = document.getElementById('pomodoro-start');
const resetBtn = document.getElementById('pomodoro-reset');

function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timeDisplay.textContent = \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
}

function toggleTimer() {
  if (isRunning) {
    clearInterval(pomodoroInterval);
    startBtn.textContent = 'Start';
    isRunning = false;
  } else {
    pomodoroInterval = setInterval(() => {
      timeLeft--;
      updateDisplay();
      
      if (timeLeft <= 0) {
        clearInterval(pomodoroInterval);
        isRunning = false;
        startBtn.textContent = 'Start';
        
        // Switch modes
        isStudyMode = !isStudyMode;
        timeLeft = isStudyMode ? 25 * 60 : 5 * 60;
        statusDisplay.textContent = isStudyMode ? 'Study Time' : 'Break Time';
        updateDisplay();
        
        // Play notification sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play();
        } catch(e) {}
      }
    }, 1000);
    startBtn.textContent = 'Pause';
    isRunning = true;
  }
}

function resetTimer() {
  clearInterval(pomodoroInterval);
  isRunning = false;
  isStudyMode = true;
  timeLeft = 25 * 60;
  statusDisplay.textContent = 'Study Time';
  startBtn.textContent = 'Start';
  updateDisplay();
}

startBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);
updateDisplay();

// Interactive Logic
function checkAnswer(qIdx, selectedIdx, correctIdx, btn, explanation) {
  const container = document.getElementById('mcq-' + qIdx);
  const btns = container.querySelectorAll('.mcq-opt-btn');
  btns.forEach(b => b.disabled = true);
  
  if (selectedIdx === correctIdx) {
    btn.classList.add('correct');
  } else {
    btn.classList.add('wrong');
    btns[correctIdx].classList.add('correct');
  }
  
  const expDiv = document.getElementById('exp-' + qIdx);
  expDiv.innerHTML = '<strong>' + (selectedIdx === correctIdx ? 'Correct!' : 'Incorrect.') + '</strong><br/>' + explanation;
  expDiv.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  let selLeft = null;
  let selRight = null;
  let matchedCount = 0;
  const totalPairs = document.querySelectorAll('.left-btn').length;

  document.querySelectorAll('.left-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if(this.classList.contains('matched')) return;
      document.querySelectorAll('.left-btn').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      selLeft = this;
      checkMatch();
    });
  });

  document.querySelectorAll('.right-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if(this.classList.contains('matched')) return;
      document.querySelectorAll('.right-btn').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      selRight = this;
      checkMatch();
    });
  });

  function checkMatch() {
    if(selLeft && selRight) {
      if(selLeft.dataset.id === selRight.dataset.match) {
        drawLine(selLeft, selRight);
        selLeft.classList.add('matched');
        selRight.classList.add('matched');
        selLeft.classList.remove('selected');
        selRight.classList.remove('selected');
        selLeft = null;
        selRight = null;
        matchedCount++;
        if(matchedCount === totalPairs && totalPairs > 0) {
          document.getElementById('match-success').style.display = 'block';
        }
      } else {
        selLeft.classList.add('error');
        selRight.classList.add('error');
        setTimeout(() => {
          selLeft.classList.remove('error', 'selected');
          selRight.classList.remove('error', 'selected');
          selLeft = null;
          selRight = null;
        }, 500);
      }
    }
  }

  function drawLine(el1, el2) {
    const svg = document.getElementById('match-svg');
    const containerRect = document.getElementById('match-game').getBoundingClientRect();
    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();

    const x1 = rect1.right - containerRect.left;
    const y1 = rect1.top + rect1.height / 2 - containerRect.top;
    const x2 = rect2.left - containerRect.left;
    const y2 = rect2.top + rect2.height / 2 - containerRect.top;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', 'match-line');
    svg.appendChild(line);
  }
});
</script>

<script>
gsap.registerPlugin(ScrollTrigger);

// Prevent flash of unstyled content
gsap.set('.gsap-up, .gsap-reveal, .gsap-scale, .gsap-left', { autoAlpha: 1 });

// Elegant staggered reveals
gsap.utils.toArray('.section').forEach(section => {
  const elements = section.querySelectorAll('.gsap-up, .gsap-reveal, .gsap-scale, .gsap-left');
  if(elements.length > 0) {
    gsap.from(elements, {
      y: 40,
      opacity: 0,
      duration: 1.5,
      stagger: 0.15,
      ease: "expo.out",
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
      }
    });
  }
});

// Deep Parallax for cards
gsap.utils.toArray('.card').forEach(card => {
  gsap.to(card, {
    y: -30,
    ease: "none",
    scrollTrigger: {
      trigger: card,
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });
});

// Parallax Logic
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  
  // Progress Bar
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolledPercent = (winScroll / height) * 100;
  document.getElementById("progress-bar").style.width = scrolledPercent + "%";

  // Parallax Elements
  document.querySelectorAll('.parallax-element').forEach(el => {
    const speed = el.getAttribute('data-speed');
    const yPos = -(scrolled * speed);
    el.style.transform = \`translateY(\${yPos}px)\`;
  });

  document.querySelectorAll('.section-parallax-bg').forEach(el => {
    const speed = el.getAttribute('data-speed');
    const yPos = (scrolled * speed);
    el.style.transform = \`translateY(\${yPos}px)\`;
  });
});

// Three.js Background Logic
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('webgl-bg'), alpha: true, antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 30;

const bgType = '${theme.bgType}';
const bgColor = ${theme.bgColor};
let mesh;

if (bgType === 'torus') {
  const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
  const material = new THREE.MeshBasicMaterial({color: bgColor, wireframe: true});
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
} else if (bgType === 'particles') {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  for (let i = 0; i < 2000; i++) {
    vertices.push(THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(100));
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.PointsMaterial({color: bgColor, size: 0.5});
  mesh = new THREE.Points(geometry, material);
  scene.add(mesh);
} else if (bgType === 'spheres') {
  mesh = new THREE.Group();
  for (let i = 0; i < 20; i++) {
    const geometry = new THREE.SphereGeometry(Math.random() * 2, 16, 16);
    const material = new THREE.MeshBasicMaterial({color: bgColor, wireframe: true, transparent: true, opacity: 0.3});
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60));
    mesh.add(sphere);
  }
  scene.add(mesh);
} else if (bgType === 'grid') {
  const geometry = new THREE.PlaneGeometry(200, 200, 20, 20);
  const material = new THREE.MeshBasicMaterial({color: bgColor, wireframe: true});
  mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  scene.add(mesh);
} else if (bgType === 'waves') {
  const geometry = new THREE.PlaneGeometry(100, 100, 30, 30);
  const material = new THREE.MeshBasicMaterial({color: bgColor, wireframe: true});
  mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 3;
  scene.add(mesh);
}

function animate() {
  requestAnimationFrame(animate);
  if (mesh) {
    if (bgType === 'torus') {
      mesh.rotation.x += 0.01;
      mesh.rotation.y += 0.005;
    } else if (bgType === 'particles') {
      mesh.rotation.y += 0.001;
    } else if (bgType === 'spheres') {
      mesh.rotation.y += 0.002;
      mesh.children.forEach(s => s.rotation.x += 0.01);
    } else if (bgType === 'grid') {
      mesh.position.z += 0.1;
      if (mesh.position.z > 20) mesh.position.z = 0;
    } else if (bgType === 'waves') {
      const time = Date.now() * 0.001;
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setZ(i, Math.sin(x * 0.2 + time) * 2 + Math.cos(y * 0.2 + time) * 2);
      }
      pos.needsUpdate = true;
    }
  }
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Flashcards Logic
let currentFlashcard = 0;
const flashcards = ${JSON.stringify(interactiveData?.flashcards || [])};

function updateFlashcard() {
  if (flashcards.length === 0) return;
  const card = flashcards[currentFlashcard];
  const flashcardEl = document.querySelector('.flashcard');
  flashcardEl.classList.remove('flipped');
  setTimeout(() => {
    document.getElementById('flashcard-question').innerText = card.term;
    document.getElementById('flashcard-answer').innerText = card.definition;
    document.getElementById('flashcard-counter').innerText = \`\${currentFlashcard + 1} / \${flashcards.length}\`;
  }, 300);
}

function nextFlashcard() {
  currentFlashcard = (currentFlashcard + 1) % flashcards.length;
  updateFlashcard();
}

function prevFlashcard() {
  currentFlashcard = (currentFlashcard - 1 + flashcards.length) % flashcards.length;
  updateFlashcard();
}

// Mind Map Logic
const mindMapData = ${JSON.stringify(interactiveData?.mindMap || { nodes: [], edges: [] })};
function drawMindMap() {
  const svg = document.getElementById('mindmap-svg');
  if (!svg || !mindMapData.nodes || mindMapData.nodes.length === 0) return;
  
  const width = 800;
  const height = 600;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Simple radial layout
  const nodes = mindMapData.nodes.map((node, i) => {
    if (i === 0) return { ...node, x: centerX, y: centerY, isRoot: true };
    const angle = (i / (mindMapData.nodes.length - 1)) * Math.PI * 2;
    const radius = 180;
    return {
      ...node,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });
  
  // Draw edges
  mindMapData.edges.forEach(edge => {
    const source = nodes.find(n => n.id === edge.from);
    const target = nodes.find(n => n.id === edge.to);
    if (source && target) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", source.x);
      line.setAttribute("y1", source.y);
      line.setAttribute("x2", target.x);
      line.setAttribute("y2", target.y);
      line.setAttribute("class", "mindmap-edge");
      svg.appendChild(line);
    }
  });
  
  // Draw nodes
  nodes.forEach(node => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", node.isRoot ? 40 : 30);
    circle.setAttribute("class", "mindmap-node" + (node.isRoot ? " root" : ""));
    
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y + 5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "mindmap-label" + (node.isRoot ? " root" : ""));
    text.textContent = node.label;
    
    g.appendChild(circle);
    g.appendChild(text);
    svg.appendChild(g);
  });
}
drawMindMap();
</script>
</body>
</html>`;
};
