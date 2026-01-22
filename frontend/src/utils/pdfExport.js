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
  
  const traditionalSuccess = traditional.final_status === 'success' ? '100%' : '0%';
  const ralphSuccess = ralph.final_status === 'success' ? '100%' : '0%';

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Traditional Agent', 'Ralph Loop Agent']],
    body: [
      ['Total Tokens', (traditional.total_tokens || 0).toLocaleString(), (ralph.total_tokens || 0).toLocaleString()],
      ['Total Time', `${((traditional.total_time_ms || 0) / 1000).toFixed(1)}s`, `${((ralph.total_time_ms || 0) / 1000).toFixed(1)}s`],
      ['Success Rate', traditionalSuccess, ralphSuccess],
      ['Final Status', traditional.final_status || 'pending', ralph.final_status || 'pending'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 20, right: 20 },
  });

  yPos = doc.lastAutoTable.finalY + 20;

  // Final Code - Traditional Agent
  if (traditional.final_code_snippet) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Traditional Agent - Final Code', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Status: ${traditional.final_status || 'pending'}`, 20, yPos);
    yPos += 8;

    // Code block with better formatting
    const codeSnippet = traditional.final_code_snippet || '// No code generated';
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
    yPos += 20;
  }

  // Final Code - Ralph Loop Agent
  if (ralph.final_code_snippet) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Ralph Loop Agent - Final Code', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Status: ${ralph.final_status || 'pending'}`, 20, yPos);
    yPos += 8;

    // Code block with better formatting
    const codeSnippet = ralph.final_code_snippet || '// No code generated';
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
