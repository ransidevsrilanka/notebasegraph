import React from 'react';

interface PDFWatermarkProps {
  email: string;
  orderId: string;
}

export const PDFWatermark: React.FC<PDFWatermarkProps> = ({ email, orderId }) => {
  // Generate multiple watermark positions for thorough coverage
  const positions = [
    { top: '15%', left: '50%' },
    { top: '50%', left: '50%' },
    { top: '85%', left: '50%' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {positions.map((pos, index) => (
        <div
          key={index}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 -rotate-45"
          style={{
            top: pos.top,
            left: pos.left,
          }}
        >
          <div
            className="text-center whitespace-nowrap select-none"
            style={{
              color: 'rgba(120, 120, 120, 0.15)',
              fontSize: '14px',
              fontFamily: 'monospace',
              fontWeight: 500,
              letterSpacing: '0.5px',
              textShadow: '0 0 1px rgba(0,0,0,0.1)',
            }}
          >
            <div>{email}</div>
            <div className="text-xs mt-0.5">ID: {orderId}</div>
          </div>
        </div>
      ))}
      
      {/* Additional diagonal pattern for extra security */}
      <div 
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 200px,
            rgba(100, 100, 100, 0.02) 200px,
            rgba(100, 100, 100, 0.02) 201px
          )`,
        }}
      />
    </div>
  );
};
