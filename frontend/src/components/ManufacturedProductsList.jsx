import React from 'react';
import ManufacturedProductsListFixed from './ManufacturedProductsListFixed';

const ManufacturedProductsList = ({ refreshTrigger }) => {
  console.log('ManufacturedProductsList wrapper is rendering - delegating to ManufacturedProductsListFixed');
  
  // Return fixed component
  return <ManufacturedProductsListFixed refreshTrigger={refreshTrigger} />;
};

export default ManufacturedProductsList;