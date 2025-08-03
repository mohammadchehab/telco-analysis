import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { FormatAlignLeft as FormatIcon, ContentCopy as CopyIcon } from '@mui/icons-material';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  height?: number;
  readOnly?: boolean;
}

const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,

  error,
  height = 400,
  readOnly = false
}) => {
  const [isValid, setIsValid] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string>('');

  // Validate JSON when value changes
  useEffect(() => {
    if (value) {
      try {
        JSON.parse(value);
        setIsValid(true);
        setValidationError('');
      } catch (e) {
        setIsValid(false);
        setValidationError('Invalid JSON format');
      }
    } else {
      setIsValid(true);
      setValidationError('');
    }
  }, [value]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const handleFormatJson = () => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        const formatted = JSON.stringify(parsed, null, 2);
        onChange(formatted);
      } catch (e) {
        setValidationError('Cannot format invalid JSON');
      }
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" color="textSecondary">
          JSON Editor
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<FormatIcon />}
            onClick={handleFormatJson}
            disabled={!value || !isValid}
            variant="outlined"
          >
            Format
          </Button>
          <Button
            size="small"
            startIcon={<CopyIcon />}
            onClick={handleCopyToClipboard}
            disabled={!value}
            variant="outlined"
          >
            Copy
          </Button>
        </Box>
      </Box>

      <Box sx={{ 
        border: error || !isValid ? '1px solid #d32f2f' : '1px solid #ccc',
        borderRadius: 1,
        overflow: 'hidden'
      }}>
        <Editor
          height={`${height}px`}
          defaultLanguage="json"
          value={value}
          onChange={handleEditorChange}
          options={{
            readOnly: readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
            },
            automaticLayout: true,
            wordWrap: 'on',
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: 'allDocuments',
            parameterHints: {
              enabled: true,
            },
            suggest: {
              insertMode: 'replace',
            },
            formatOnPaste: true,
            formatOnType: true,
          }}
          theme="vs-dark"
        />
      </Box>

      {(error || validationError) && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error || validationError}
        </Alert>
      )}

      {isValid && value && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Valid JSON format
        </Alert>
      )}
    </Box>
  );
};

export default JsonEditor; 