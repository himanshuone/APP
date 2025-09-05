const fs = require('fs');

// Read the original CSV file
const originalCsv = fs.readFileSync('../question.csv', 'utf-8');
const lines = originalCsv.split('\n');

// New header with all required fields
const newHeader = 'question_text,question_type,subject,topic,option_1,option_1_correct,option_2,option_2_correct,option_3,option_3_correct,option_4,option_4_correct,marks,negative_marks,explanation,correct_answer';

const fixedLines = [newHeader];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Parse CSV row
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  
  if (parts.length < 12) continue; // Skip incomplete rows
  
  const [question_text, type, subject, topic, opt1, opt1_correct, opt2, opt2_correct, opt3, opt3_correct, opt4, opt4_correct] = parts;
  
  // Fix boolean values
  const fixBoolean = (val) => val.toLowerCase() === 'true' ? 'true' : 'false';
  
  // Handle NAT questions - extract answer from option_1 if it's a number
  let correctAnswer = '';
  let fixedOpt1 = opt1, fixedOpt1Correct = opt1_correct;
  
  if (type === 'NAT' && opt1 && !isNaN(parseFloat(opt1))) {
    correctAnswer = opt1;
    fixedOpt1 = '';
    fixedOpt1Correct = '';
  }
  
  // Create new row with proper format
  const newRow = [
    `"${question_text}"`,
    type === 'type' ? 'question_type' : type, // Fix header
    subject,
    topic,
    fixedOpt1 ? `"${fixedOpt1}"` : '""',
    fixedOpt1Correct ? fixBoolean(fixedOpt1Correct) : '""',
    opt2 ? `"${opt2}"` : '""',
    opt2_correct ? fixBoolean(opt2_correct) : '""',
    opt3 ? `"${opt3}"` : '""',
    opt3_correct ? fixBoolean(opt3_correct) : '""',
    opt4 ? `"${opt4}"` : '""',
    opt4_correct ? fixBoolean(opt4_correct) : '""',
    '1', // marks
    '0.33', // negative_marks
    '""', // explanation
    correctAnswer
  ].join(',');
  
  fixedLines.push(newRow);
}

// Write the fixed CSV
fs.writeFileSync('questions_converted.csv', fixedLines.join('\n'));
console.log(`Converted ${fixedLines.length - 1} questions to questions_converted.csv`);
