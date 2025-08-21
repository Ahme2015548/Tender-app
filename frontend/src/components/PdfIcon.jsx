import React from 'react';
import { ASSETS } from '../utils/assetHelpers';

const PdfIcon = ({ 
  size = 32, 
  clickable = false, 
  onClick = null,
  title = "PDF",
  className = "",
  style = {}
}) => {
  const baseStyle = {
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'contain',
    ...(clickable && { cursor: 'pointer' }),
    ...style
  };

  const handleClick = (e) => {
    if (clickable && onClick) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <img 
      src={ASSETS.pdfIcon()}
      alt="PDF"
      title={title}
      className={className}
      style={baseStyle}
      onClick={handleClick}
    />
  );
};

export default PdfIcon;