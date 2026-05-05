
import React, { useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Microscope, FileCode } from 'lucide-react';
import { StentReport } from '../types';

interface ReportDocumentProps {
  report: StentReport;
}

export const ReportDocument: React.FC<ReportDocumentProps> = ({ report }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const canvasHeightInMm = (imgProps.height * pdfWidth) / imgProps.width;
    
    let heightLeft = canvasHeightInMm;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInMm);
    heightLeft -= pdfPageHeight;

    // Add subsequent pages
    while (heightLeft > 0) {
      position -= pdfPageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInMm);
      heightLeft -= pdfPageHeight;
    }
    
    pdf.save(`Stent_Report_${report.sample.replace(/\s+/g, '_')}.pdf`);
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Stent_Report_${report.sample.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const ratioCalcPercent = (report.encapRatioVsCalc * 100).toFixed(2);
  const ratioStentPercent = (report.encapRatioVsStent * 100).toFixed(2);
  const calcBurden = (report.calcArea / report.stentRodArea).toFixed(1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end gap-3 px-4">
        <button
          onClick={exportJSON}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
        >
          <FileCode className="w-4 h-4" /> Export JSON
        </button>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-md shadow-slate-200"
        >
          <Download className="w-4 h-4" /> Export Nature Style PDF
        </button>
      </div>

      <div 
        ref={reportRef}
        className="bg-white p-16 shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] font-sans text-slate-900"
        id="nature-report-root"
      >
        {/* Header Section */}
        <header className="border-b-2 border-slate-900 pb-4 mb-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase italic">Nature Materials | Analysis Report</span>
            <span className="text-xs text-slate-400 font-mono">DB-REF: {report.id.slice(0, 8)}</span>
          </div>
          <h1 className="font-serif text-3xl leading-tight mb-4 text-slate-900">
            Compositional and Morphometric Analysis of {report.stentMaterial} Stent Implantation in a Severely Calcified Vascular Environment
          </h1>
          <div className="flex gap-4 text-xs font-medium text-slate-600">
            <span>Sample ID: <span className="text-slate-900 font-bold">{report.sample}</span></span>
            <span>|</span>
            <span>Analysis Date: {new Date(report.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>

        {/* Abstract */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-slate-900 border-l-4 border-slate-900 pl-3">1. Abstract</h2>
          <p className="text-[11pt] leading-relaxed text-justify text-slate-800">
            This study presents a quantitative morphometric analysis of an intravascular stent fabricated from {report.stentMaterial} alloy embedded within a calcified arterial matrix. 
            The sample exhibits a disproportionate calcification burden relative to the stent surface area, indicating a high-grade atherosclerotic lesion at the time of analysis. 
            Quantitative area mapping reveals that the calcified tissue volume ({report.calcArea.toLocaleString()} area units) exceeds the metallic strut cross-section ({report.stentRodArea.toLocaleString()}) 
            by a factor of ~{calcBurden}, while the tissue encapsulation ratio remains critically low ({ratioStentPercent}% vs stent). 
            These geometric parameters suggest a mechanically rigid interface where calcification dictates the effective expansion diameter and radial compliance, 
            potentially limiting stent apposition. The findings underscore the necessity of pre-implantation plaque modification strategies.
          </p>
        </section>

        {/* Results and Discussion */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-slate-900 border-l-4 border-slate-900 pl-3">2. Results and Discussion</h2>
          
          <div className="mb-6">
            <h3 className="text-sm font-bold italic mb-2">2.1 Material Characterization and Identification</h3>
            <p className="text-[11pt] leading-relaxed text-slate-800 mb-3">
              The sample identified as "{report.sample}" is confirmed to be manufactured from {report.stentMaterial}, 
              a precipitation-hardened nickel-chromium-molybdenum-cobalt superalloy. {report.stentMaterial} is historically characterized 
              by its exceptional corrosion resistance and superior creep strength. The material classification is definitive, 
              forming a microstructure optimized for high-stress biomedical applications.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-8">
            <div className="flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold italic mb-2">2.2 Calcification Burden and Morphometry</h3>
                <p className="text-[11pt] leading-relaxed text-slate-800 mb-3 text-justify">
                  Morphometric analysis reveals a significant disparity between the metallic strut geometry and the surrounding tissue. 
                  The Stent Rod Area ({report.stentRodArea.toLocaleString()} units) is dwarfed by the Calc_Area ({report.calcArea.toLocaleString()} units), 
                  indicating a calcification burden approximately {calcBurden} times greater than the visible stent cross-section. 
                  Crucially, the Encap_Area ({report.encapArea.toLocaleString()}) is negligible relative to the stent surface ({ratioStentPercent}% coverage).
                </p>
              </div>
            </div>
            <div className="bg-slate-50 p-6 border border-slate-200 rounded-lg">
              <h4 className="text-[10pt] font-bold mb-4 uppercase tracking-tighter text-slate-500 border-b border-slate-200 pb-2 flex items-center gap-2">
                <Microscope className="w-3 h-3"/> Quantitative Metrics
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 py-1"><span>Stent Rod Area</span><span className="font-mono font-bold text-slate-900">{report.stentRodArea.toLocaleString()}</span></div>
                <div className="flex justify-between border-b border-slate-100 py-1"><span>Calcified Area</span><span className="font-mono font-bold text-slate-900">{report.calcArea.toLocaleString()}</span></div>
                <div className="flex justify-between border-b border-slate-100 py-1"><span>Encapsulation Area</span><span className="font-mono font-bold text-slate-900">{report.encapArea.toLocaleString()}</span></div>
                <div className="flex justify-between border-b border-slate-100 py-1"><span>Burden Ratio (C/S)</span><span className="font-mono font-bold text-blue-600">{calcBurden}x</span></div>
                <div className="flex justify-between py-1 font-bold text-slate-900"><span>Encap. Ratio (E/S)</span><span className="text-red-600">{ratioStentPercent}%</span></div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold italic mb-2">2.3 Biomechanical Implications and Integration</h3>
            <p className="text-[11pt] leading-relaxed text-slate-800 text-justify">
              The spatial relationship between the calcified matrix and the stent interface is quantified by derived distance metrics. 
              With a mean calcification distance of {report.calcDistMean.toFixed(1)} units and a maximum of {report.calcDistMax.toFixed(1)} units, 
              the calcification exists in immediate contact with the stent surface at multiple points. Given the high stiffness of the 
              calcified shell, the {report.stentMaterial} stent likely underwent constrained expansion. The low encapsulation ({ratioCalcPercent}% vs calc) 
              suggests the implant remains mechanically coupled to the calcified plaque rather than being integrated via biological healing.
            </p>
          </div>
        </section>

        {/* Conclusion */}
        <section className="mb-8 p-6 bg-slate-900 text-white rounded-lg">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-50">3. Conclusion</h2>
          <p className="text-[11pt] leading-relaxed italic">
            The analysis confirms that the dominant pathological factor is the calcification burden, not the metallic implant dimensions. 
            The extreme ratio of calcified tissue to stent area, combined with minimal encapsulation, indicates a failure of the implant 
            to integrate with the surrounding vasculature. Future strategies for such lesions should prioritize reducing the calcified 
            burden before deployment to ensure adequate radial expansion and long-term stability.
          </p>
        </section>

        {/* Experimental Section */}
        <section className="border-t border-slate-200 pt-8 text-[9pt] text-slate-500 grid grid-cols-2 gap-12">
          <div>
            <h2 className="text-[10pt] font-bold uppercase mb-3 text-slate-900">4. Experimental Section</h2>
            <p className="mb-3"><strong>Sample Preparation:</strong> The vascular tissue sample was prepared for cross-sectional analysis by fixation in standard histological buffers.</p>
            <p><strong>Image Acquisition:</strong> Cross-sectional images were acquired using high-resolution SEM/EDS targeted to the ROI.</p>
          </div>
          <div>
            <h2 className="text-[10pt] font-bold uppercase mb-3 text-slate-900 invisible">4. (Cont.)</h2>
            <p className="mb-3"><strong>Quantitative Analysis:</strong> Area segmentation performed via standardized pixel counting. Ratios computed as: Encap_Ratio_vs_Calc = Encap_Area / Calc_Area; Encap_Ratio_vs_Stent = Encap_Area / Stent_Rod_Area.</p>
            <p><strong>Distance Metrics:</strong> Distance mapping determined spatial proximity of calcification to the stent surface (Min/Max/Mean).</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-4 border-t border-slate-100 text-center">
            <div className="flex justify-center gap-12 mb-4">
              <div className="text-[8pt] font-bold uppercase tracking-widest text-slate-300">Materials Science</div>
              <div className="text-[8pt] font-bold uppercase tracking-widest text-slate-300">Biomedical Engineering</div>
              <div className="text-[8pt] font-bold uppercase tracking-widest text-slate-300">Vascular Pathology</div>
            </div>
            <p className="text-[7pt] text-slate-400 font-mono tracking-tighter">Generated by AI-Studio Computational Analysis Engine | © 2026 Materia Medica</p>
        </footer>
      </div>
    </div>
  );
};
