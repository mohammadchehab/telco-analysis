import React from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Button,
  Tooltip
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

interface Capability {
  id: number;
  name: string;
  status: string;
  domains_count?: number;
  attributes_count?: number;
  last_updated?: string;
  description?: string;
  created_at?: string;
  version_string?: string;
}

interface CapabilitySelectorProps {
  capabilities: Capability[];
  selectedCapability: Capability | null;
  onCapabilityChange: (capability: Capability | null) => void;
  loading?: boolean;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onClear?: () => void;
  showClearButton?: boolean;
  showExportButton?: boolean;
  showRefreshButton?: boolean;
  showFiltersButton?: boolean;
  disabled?: boolean;
  title?: string;
  standalone?: boolean;
}

const CapabilitySelector: React.FC<CapabilitySelectorProps> = ({
  capabilities,
  selectedCapability,
  onCapabilityChange,
  loading = false,
  showFilters = false,
  onToggleFilters,
  onRefresh,
  onExport,
  onClear,
  showClearButton = false,
  showExportButton = true,
  showRefreshButton = true,
  showFiltersButton = true,
  disabled = false,
  title = "Select Capability",
  standalone = true
}) => {
  const completedCapabilities = capabilities.filter(cap => cap.status === 'completed');
  const hasCompletedCapabilities = completedCapabilities.length > 0;

  const content = (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, alignItems: 'center' }}>
        <FormControl fullWidth>
          <InputLabel>{title}</InputLabel>
          <Select
            value={selectedCapability?.id || ''}
            label={title}
            onChange={(e) => {
              const capabilityId = typeof e.target.value === 'string' ? parseInt(e.target.value) : e.target.value;
              const capability = capabilities.find(c => c.id === capabilityId) || null;
              onCapabilityChange(capability);
            }}
            disabled={loading || disabled}
          >
            {capabilities.map((capability) => (
              <MenuItem 
                key={capability.id} 
                value={capability.id}
                disabled={capability.status !== "completed"}
              >
                {capability.name} ({capability.status})
                {capability.status !== "completed" && " - Reports not available"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {showClearButton && onClear && (
            <Tooltip title="Clear All Settings">
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={onClear}
                disabled={disabled}
              >
                Clear
              </Button>
            </Tooltip>
          )}
          {showFiltersButton && onToggleFilters && (
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={onToggleFilters}
              disabled={!selectedCapability || disabled}
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          )}
          {showRefreshButton && onRefresh && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
              disabled={!selectedCapability || loading || disabled}
            >
              Refresh
            </Button>
          )}
          {showExportButton && onExport && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={onExport}
              disabled={!selectedCapability || loading || disabled}
            >
              Export
            </Button>
          )}
        </Box>
      </Box>
      {capabilities.length > 0 && !hasCompletedCapabilities && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No completed capabilities found. Reports are only available for capabilities with "completed" status.
        </Alert>
      )}
    </>
  );

  if (standalone) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
};

export default CapabilitySelector; 