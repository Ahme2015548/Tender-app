/**
 * Quick countdown timer test - Run in browser console
 */
export const testCountdownAccuracy = () => {
  console.log('🧪 COUNTDOWN TIMER ACCURACY TEST');
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  // Format as HTML date input would (YYYY-MM-DD)
  const tomorrowString = tomorrow.toISOString().split('T')[0];
  
  console.log('Test Data:', {
    today: today.toLocaleDateString(),
    tomorrow: tomorrow.toLocaleDateString(), 
    tomorrowString,
    expectedDays: 1
  });
  
  // Simulate the countdown timer logic
  const [year, month, day] = tomorrowString.split('-').map(Number);
  const expiry = new Date(year, month - 1, day, 23, 59, 59, 999);
  
  const difference = expiry.getTime() - today.getTime();
  const calculatedDays = Math.floor(difference / (1000 * 60 * 60 * 24));
  
  console.log('Results:', {
    parsedExpiry: expiry.toLocaleDateString(),
    calculatedDays,
    isAccurate: calculatedDays === 1,
    status: calculatedDays === 1 ? '✅ ACCURATE' : `❌ WRONG (expected 1, got ${calculatedDays})`
  });
  
  return calculatedDays === 1;
};

// Auto-run test
if (typeof window !== 'undefined') {
  console.log('🚀 Auto-running countdown test...');
  testCountdownAccuracy();
}