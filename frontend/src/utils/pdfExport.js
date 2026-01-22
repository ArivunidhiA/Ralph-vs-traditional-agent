import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const taskNames = {
  'rest-api': 'REST API',
  'todo-component': 'React Todo Component',
  'data-processor': 'Data Processing Script',
  'unit-tests': 'Unit Test Suite',
  'auth-middleware': 'Authentication Middleware',
};

export function exportBattleToPDF(battle, task) {
  if (!battle) {
    throw new Error('Battle data is required');
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Ralph Loop Arena - Battle Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Battle Metadata
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const taskName = task ? task.title : (taskNames[battle.task_id] || battle.task_id);
  doc.text(`Task: ${taskName}`, 20, yPos);
  yPos += 7;
  doc.text(`Battle ID: ${battle.id}`, 20, yPos);
  yPos += 7;
  
  const battleDate = battle.created_at 
    ? new Date(battle.created_at).toLocaleString()
    : 'Unknown';
  doc.text(`Date: ${battleDate}`, 20, yPos);
  yPos += 7;
  
  if (battle.winner) {
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Winner: ${battle.winner === 'ralph' ? 'Ralph Loop Agent' : 'Traditional Agent'}`,
      20,
      yPos
    );
    doc.setFont('helvetica', 'normal');
    yPos += 7;
  }
  
  doc.text(`Status: ${battle.status}`, 20, yPos);
  yPos += 15;

  // Metrics Table
  const traditional = battle.traditional_agent || {};
  const ralph = battle.ralph_agent || {};
  
  const traditionalIterations = traditional.iterations || [];
  const ralphIterations = ralph.iterations || [];
  
  const traditionalSuccessRate = traditionalIterations.length > 0
    ? ((traditional.success_count || 0) / traditionalIterations.length * 100).toFixed(1)
    : '0';
  
  const ralphSuccessRate = ralphIterations.length > 0
    ? ((ralph.success_count || 0) / ralphIterations.length * 100).toFixed(1)
    : '0';

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Traditional Agent', 'Ralph Loop Agent']],
    body: [
      ['Iterations', traditionalIterations.length.toString(), ralphIterations.length.toString()],
      ['Total Tokens', (traditional.total_tokens || 0).toLocaleString(), (ralph.total_tokens || 0).toLocaleString()],
      ['Total Time', `${((traditional.total_time_ms || 0) / 1000).toFixed(1)}s`, `${((ralph.total_time_ms || 0) / 1000).toFixed(1)}s`],
      ['Success Rate', `${traditionalSuccessRate}%`, `${ralphSuccessRate}%`],
      ['Avg Tokens/Iter', 
        traditionalIterations.length > 0 
          ? Math.round((traditional.total_tokens || 0) / traditionalIterations.length).toString()
          : '0',
        ralphIterations.length > 0
          ? Math.round((ralph.total_tokens || 0) / ralphIterations.length).toString()
          : '0'
      ],
      ['Avg Time/Iter',
        traditionalIterations.length > 0
          ? `${((traditional.total_time_ms || 0) / traditionalIterations.length / 1000).toFixed(1)}s`
          : '0s',
        ralphIterations.length > 0
          ? `${((ralph.total_time_ms || 0) / ralphIterations.length / 1000).toFixed(1)}s`
          : '0s'
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 20, right: 20 },
  });

  yPos = doc.lastAutoTable.finalY + 20;

  // Iteration Details - Traditional Agent
  if (traditionalIterations.length > 0) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Traditional Agent - Iterations', 20, yPos);
    yPos += 10;

    const traditionalTableData = traditionalIterations.map((iter, idx) => [
      (idx + 1).toString(),
      iter.status || 'unknown',
      iter.tokens_used?.toString() || '0',
      `${((iter.time_taken_ms || 0) / 1000).toFixed(1)}s`,
      (iter.context_size || 0).toLocaleString(),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Status', 'Tokens', 'Time', 'Context Size']],
      body: traditionalTableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { left: 20, right: 20 },
    });

    yPos = doc.lastAutoTable.finalY + 20;

    // Code snippets for Traditional Agent (first 3 iterations)
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Traditional Agent - Code Snippets', 20, yPos);
    yPos += 12;

    traditionalIterations.slice(0, 3).forEach((iter, idx) => {
      // Check if we need a new page before starting iteration
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Iteration ${iter.iteration_number} (${iter.status})`, 20, yPos);
      yPos += 8;

      // Code block with better formatting
      const codeSnippet = iter.code_snippet || '// No code generated';
      const codeWidth = pageWidth - 40;
      const codeLines = doc.splitTextToSize(codeSnippet, codeWidth);
      
      // Write code with monospace font
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      
      const lineHeight = 4.5;
      const padding = 3;
      
      let lineIdx = 0;
      while (lineIdx < codeLines.length) {
        // Calculate how many lines fit on current page
        const remainingSpace = pageHeight - yPos - 15;
        const linesForThisPage = Math.min(
          Math.floor(remainingSpace / lineHeight),
          codeLines.length - lineIdx
        );
        
        if (linesForThisPage <= 0) {
          doc.addPage();
          yPos = 20;
          continue;
        }
        
        const blockStartY = yPos - padding;
        const blockHeight = linesForThisPage * lineHeight + padding * 2;
        
        // Draw background and border first
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(20, blockStartY, codeWidth, blockHeight, 2, 2, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(20, blockStartY, codeWidth, blockHeight, 2, 2, 'S');
        
        // Then write the text
        for (let i = 0; i < linesForThisPage; i++) {
          doc.text(codeLines[lineIdx], 25, yPos);
          yPos += lineHeight;
          lineIdx++;
        }
        
        // If there are more lines, prepare for next page
        if (lineIdx < codeLines.length) {
          doc.addPage();
          yPos = 20;
        }
      }
      
      // Reset font and add spacing after code block
      doc.setFont('helvetica', 'normal');
      yPos += 10;
    });
  }

  // Iteration Details - Ralph Loop Agent
  if (ralphIterations.length > 0) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Ralph Loop Agent - Iterations', 20, yPos);
    yPos += 10;

    const ralphTableData = ralphIterations.map((iter, idx) => [
      (idx + 1).toString(),
      iter.status || 'unknown',
      iter.tokens_used?.toString() || '0',
      `${((iter.time_taken_ms || 0) / 1000).toFixed(1)}s`,
      (iter.context_size || 0).toLocaleString(),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Status', 'Tokens', 'Time', 'Context Size']],
      body: ralphTableData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { left: 20, right: 20 },
    });

    yPos = doc.lastAutoTable.finalY + 20;

    // Code snippets for Ralph Loop Agent (first 3 iterations)
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Ralph Loop Agent - Code Snippets', 20, yPos);
    yPos += 12;

    ralphIterations.slice(0, 3).forEach((iter, idx) => {
      // Check if we need a new page before starting iteration
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Iteration ${iter.iteration_number} (${iter.status})`, 20, yPos);
      yPos += 8;

      // Code block with better formatting
      const codeSnippet = iter.code_snippet || '// No code generated';
      const codeWidth = pageWidth - 40;
      const codeLines = doc.splitTextToSize(codeSnippet, codeWidth);
      
      // Write code with monospace font
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      
      const lineHeight = 4.5;
      const padding = 3;
      
      let lineIdx = 0;
      while (lineIdx < codeLines.length) {
        // Calculate how many lines fit on current page
        const remainingSpace = pageHeight - yPos - 15;
        const linesForThisPage = Math.min(
          Math.floor(remainingSpace / lineHeight),
          codeLines.length - lineIdx
        );
        
        if (linesForThisPage <= 0) {
          doc.addPage();
          yPos = 20;
          continue;
        }
        
        const blockStartY = yPos - padding;
        const blockHeight = linesForThisPage * lineHeight + padding * 2;
        
        // Draw background and border first
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(20, blockStartY, codeWidth, blockHeight, 2, 2, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(20, blockStartY, codeWidth, blockHeight, 2, 2, 'S');
        
        // Then write the text
        for (let i = 0; i < linesForThisPage; i++) {
          doc.text(codeLines[lineIdx], 25, yPos);
          yPos += lineHeight;
          lineIdx++;
        }
        
        // If there are more lines, prepare for next page
        if (lineIdx < codeLines.length) {
          doc.addPage();
          yPos = 20;
        }
      }
      
      // Reset font and add spacing after code block
      doc.setFont('helvetica', 'normal');
      yPos += 10;
    });
  }

  // Footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${totalPages} - Ralph Loop Arena`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const taskNameSlug = taskName.toLowerCase().replace(/\s+/g, '-');
  const dateStr = battle.created_at 
    ? new Date(battle.created_at).toISOString().split('T')[0]
    : 'unknown';
  const filename = `ralph-arena-battle-${taskNameSlug}-${dateStr}.pdf`;

  // Save PDF
  doc.save(filename);
}
