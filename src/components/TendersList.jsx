import React from 'react';
import TendersListFixed from './TendersListFixed';

const TendersList = ({ refreshTrigger }) => {
  console.log('TendersList wrapper is rendering - delegating to TendersListFixed');
  
  // Return fixed component
  return <TendersListFixed refreshTrigger={refreshTrigger} />;
};

export default TendersList;