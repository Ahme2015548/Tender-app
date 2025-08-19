/**
 * Date Debugging Utility - Helps diagnose date parsing issues
 * Created to solve countdown timer accuracy problems
 */

export const debugDateParsing = (inputDate, label = "Date") => {
  console.log(`🔍 ${label.toUpperCase()} DEBUG:`, {
    input: inputDate,
    inputType: typeof inputDate,
    inputValue: String(inputDate),
    
    // Try different parsing methods
    parseResults: {
      directParse: new Date(inputDate),
      directParseISO: new Date(inputDate).toISOString(),
      directParseLocal: new Date(inputDate).toLocaleString(),
    },
    
    // If it's a string, try different interpretations  
    stringParsing: typeof inputDate === 'string' ? {
      hasHyphens: inputDate.includes('-'),
      hasSlashes: inputDate.includes('/'),
      length: inputDate.length,
      parts: inputDate.includes('-') 
        ? inputDate.split('-') 
        : inputDate.includes('/') 
          ? inputDate.split('/')  
          : [inputDate]
    } : null,
    
    // Current time for comparison
    currentTime: {
      now: new Date(),
      nowISO: new Date().toISOString(),
      nowLocal: new Date().toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  });
};

export const validateCountdown = (expiryDate, expectedDays) => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const actualDiffMs = expiry.getTime() - now.getTime();
  const actualDays = actualDiffMs / (1000 * 60 * 60 * 24);
  
  console.log(`⏰ COUNTDOWN VALIDATION:`, {
    expiryDate,
    expectedDays,
    actualDays: Math.round(actualDays * 100) / 100,
    difference: Math.abs(actualDays - expectedDays),
    isAccurate: Math.abs(actualDays - expectedDays) < 1,
    recommendation: actualDays !== expectedDays 
      ? `Expected ${expectedDays} days, got ${actualDays.toFixed(1)} days. Check date format interpretation.`
      : 'Countdown is accurate!'
  });
  
  return Math.abs(actualDays - expectedDays) < 1;
};

export default {
  debugDateParsing,
  validateCountdown
};