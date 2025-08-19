import React from 'react';

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
      src="/assets/images/pdf-icon.png"
      alt="PDF"
      title={title}
      className={className}
      style={baseStyle}
      onClick={handleClick}
    />
  );
};

export default PdfIcon;