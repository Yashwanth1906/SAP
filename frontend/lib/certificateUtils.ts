import html2canvas from 'html2canvas';

export const downloadCertificate = async (elementRef: React.RefObject<HTMLDivElement>, fileName: string = 'certificate') => {
  if (!elementRef.current) {
    console.error('Certificate element not found');
    return;
  }

  try {
    // Show loading state
    const downloadBtn = document.querySelector('[data-download-btn]') as HTMLButtonElement;
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = 'Generating...';
    }

    // Configure html2canvas options for better quality
    const canvas = await html2canvas(elementRef.current, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: elementRef.current.offsetWidth,
      height: elementRef.current.offsetHeight,
      scrollX: 0,
      scrollY: 0,
    });

    // Convert canvas to blob
    canvas.toBlob((blob: any) => {
      if (blob) {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.png`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
      }
    }, 'image/png', 0.95);

    // Reset button state
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download Certificate
      `;
    }
  } catch (error) {
    console.error('Error generating certificate:', error);
    
    // Reset button state on error
    const downloadBtn = document.querySelector('[data-download-btn]') as HTMLButtonElement;
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download Certificate
      `;
    }
  }
};

export const getCertificateType = (fairnessScore?: number, intentionalBias?: string) => {
  if (intentionalBias && intentionalBias.trim() !== '') {
    return {
      type: 'Intentional Bias',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'This model has been identified with intentional bias and requires immediate attention.'
    };
  } else if (fairnessScore !== undefined && fairnessScore < 0.5) {
    return {
      type: 'Biased Certification',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'This model shows significant bias and requires mitigation strategies.'
    };
  } else {
    return {
      type: 'Not Biased',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'This model has passed bias evaluation and is certified for fair use.'
    };
  }
}; 