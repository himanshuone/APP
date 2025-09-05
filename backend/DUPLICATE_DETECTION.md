# CSV Duplicate Detection Algorithm

## Overview

The CSV upload system now includes comprehensive duplicate detection to prevent importing duplicate questions from CSV files. The algorithm operates at multiple levels to ensure data integrity and provide detailed feedback to users.

## Detection Levels

### 1. Within CSV File Detection
- **Purpose**: Identifies duplicate questions within the same CSV file
- **Method**: Normalized comparison using question text, subject, and topic
- **Action**: Skips duplicate rows, includes only the first occurrence

### 2. Database Comparison
- **Purpose**: Prevents importing questions that already exist in the database
- **Method**: Compares CSV questions against existing database records
- **Action**: Skips questions that match existing records

### 3. Preview Analysis
- **Purpose**: Shows duplicate warnings in CSV preview before import
- **Method**: Same normalization logic applied to preview rows
- **Action**: Adds warning flags to preview questions

## Normalization Algorithm

Questions are considered duplicates if they match on all three criteria after normalization:

```
Normalized Key = question_text|subject|topic
```

### Normalization Rules:
- **Case Insensitive**: All text converted to lowercase
- **Whitespace Trimmed**: Leading/trailing spaces removed
- **Default Values**: Empty subject/topic defaults to "General"

### Example:
```
"What is Binary Search?" + "Algorithms" + "Searching"
becomes:
"what is binary search?|algorithms|searching"
```

## API Endpoints

### CSV Upload - `/api/admin/upload/csv`
**Enhanced Response Format:**
```json
{
  "message": "Successfully processed CSV file",
  "questions_added": 5,
  "duplicates_skipped": 3,
  "total_errors": 1,
  "duplicate_details": [
    {
      "row_number": 3,
      "question_text": "What is Binary Search?",
      "subject": "Algorithms",
      "topic": "Searching",
      "duplicate_type": "within_csv"
    },
    {
      "row_number": 4,
      "question_text": "What is Sorting?",
      "subject": "Algorithms", 
      "topic": "Sorting",
      "duplicate_type": "database_existing"
    }
  ],
  "errors": ["Row 8: Invalid question type"],
  "summary": {
    "total_rows_processed": 8,
    "unique_questions_added": 5,
    "csv_internal_duplicates": 1,
    "database_duplicates": 2,
    "processing_errors": 1
  }
}
```

### CSV Preview - `/api/admin/preview-csv`
**Enhanced Response Format:**
```json
{
  "headers": ["question_text", "question_type", "subject", "topic", "..."],
  "preview_questions": [
    {
      "row_number": 1,
      "question_text": "What is Binary Search?",
      "question_type": "MCQ",
      "subject": "Algorithms",
      "topic": "Searching",
      "duplicate_warning": null
    },
    {
      "row_number": 3,
      "question_text": "What is Binary Search?",
      "question_type": "MCQ", 
      "subject": "Algorithms",
      "topic": "Searching",
      "duplicate_warning": "Duplicate question found within this CSV file"
    }
  ],
  "duplicate_analysis": {
    "total_duplicates_in_preview": 2,
    "database_duplicates": 1,
    "csv_internal_duplicates": 1,
    "note": "This is a preview of first 10 rows. Full analysis will be done during import."
  }
}
```

## Duplicate Types

### `within_csv`
- **Description**: Question appears multiple times in the same CSV file
- **Action**: Only first occurrence is processed
- **Example**: Rows 2 and 5 have identical question text, subject, and topic

### `database_existing`  
- **Description**: Question already exists in the database
- **Action**: Skipped during import
- **Example**: CSV contains "What is sorting?" but this question already exists

## Performance Considerations

### Memory Usage
- **CSV Processing**: Keeps normalized keys in memory (Set data structure)
- **Database Query**: Single query fetches all existing questions for comparison
- **Scalability**: Efficient for typical CSV sizes (< 10,000 questions)

### Database Impact
- **Read Operations**: One query to fetch existing questions
- **Write Operations**: Only unique questions are inserted
- **Indexing**: Consider adding compound index on (question_text, subject, topic)

## Testing

### Test CSV File
Use `test_duplicate_csv.csv` to verify duplicate detection:
- Contains intentional duplicates within the file
- Mix of MCQ, MSQ, and NAT question types
- Various subjects and topics for comprehensive testing

### Manual Testing Steps
1. Upload test CSV via preview endpoint
2. Verify duplicate warnings in response
3. Import the CSV file
4. Confirm only unique questions were added
5. Check detailed duplicate report

## Error Handling

### Common Scenarios
- **Empty CSV**: Returns appropriate error message
- **Invalid Headers**: Processing continues with warnings
- **Database Errors**: Detailed error reporting
- **Memory Limits**: Graceful handling for large files

### Error Response Format
```json
{
  "questions_added": 0,
  "duplicates_skipped": 0,
  "total_errors": 5,
  "errors": [
    "Row 2: Missing question text",
    "Row 3: Invalid question type: INVALID",
    "Row 5: Database error: Connection timeout"
  ]
}
```

## Configuration

### Duplicate Detection Settings
Currently hardcoded but can be made configurable:
- **Normalization**: Case sensitivity, whitespace handling
- **Matching Criteria**: Include/exclude additional fields
- **Batch Size**: For large CSV processing
- **Memory Limits**: Maximum questions to process at once

## Future Enhancements

### Fuzzy Matching
- **Similarity Threshold**: Allow nearly-identical questions
- **Levenshtein Distance**: Character-level comparison
- **Semantic Analysis**: NLP-based question similarity

### Advanced Deduplication
- **Question Variants**: Detect rephrased questions
- **Option Order**: Ignore different option arrangements
- **Answer Equivalence**: Multiple correct answer formats

### User Interface
- **Duplicate Resolution**: Let users choose which version to keep
- **Bulk Operations**: Mass duplicate removal tools
- **Visual Indicators**: Highlight duplicates in preview

## Security Considerations

- **Input Validation**: All CSV data sanitized before processing
- **Memory Limits**: Prevent DoS attacks via large files
- **Rate Limiting**: Prevent abuse of upload endpoints
- **Authentication**: Admin-only access to upload functions
