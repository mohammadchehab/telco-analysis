import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Button,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Assessment as ReportsIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { WorkflowState } from '../../types';

interface Capability {
  id: number;
  name: string;
  status: WorkflowState;
  domains_count: number;
  attributes_count: number;
  last_updated: string;
  version_string?: string;
}

interface KanbanBoardProps {
  capabilities: Capability[];
  onCapabilityClick: (capability: Capability) => void;
  onStartResearch: (capabilityId: number, capabilityName: string) => void;
  onViewReports: (capabilityId: number, capabilityName: string) => void;
  onEditClick: (capability: Capability) => void;
  onDeleteClick: (capability: Capability) => void;
  onViewDetails: (capabilityId: number) => void;
  onStatusChange: (capabilityId: number, newStatus: WorkflowState) => void;
  onManageDomains: (capabilityId: number) => void;
  onManageAttributes: (capabilityId: number) => void;
}

interface KanbanColumn {
  id: WorkflowState;
  title: string;
  color: 'error' | 'warning' | 'success' | 'info' | 'default';
  icon: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: WorkflowState.NEW,
    title: 'Domain Analysis',
    color: 'error',
    icon: '🔴',
  },
  {
    id: WorkflowState.REVIEW,
    title: 'Review Required',
    color: 'warning',
    icon: '🟡',
  },
  {
    id: WorkflowState.READY,
    title: 'Ready for Research',
    color: 'success',
    icon: '🟢',
  },
  {
    id: WorkflowState.COMPLETED,
    title: 'Completed',
    color: 'info',
    icon: '✅',
  },
];

const getStatusColor = (status: WorkflowState) => {
  switch (status) {
    case WorkflowState.READY:
      return 'success';
    case WorkflowState.REVIEW:
      return 'warning';
    case WorkflowState.NEW:
      return 'error';
    case WorkflowState.COMPLETED:
      return 'info';
    default:
      return 'default';
  }
};

const getStatusText = (status: WorkflowState) => {
  switch (status) {
    case WorkflowState.READY:
      return 'Ready for Research';
    case WorkflowState.REVIEW:
      return 'Review Required';
    case WorkflowState.NEW:
      return 'Domain Analysis';
    case WorkflowState.COMPLETED:
      return 'Completed';
    default:
      return status;
  }
};

interface SortableCapabilityCardProps {
  capability: Capability;
  onCapabilityClick: (capability: Capability) => void;
  onStartResearch: (capabilityId: number, capabilityName: string) => void;
  onViewReports: (capabilityId: number, capabilityName: string) => void;
  onEditClick: (capability: Capability) => void;
  onDeleteClick: (capability: Capability) => void;
  onViewDetails: (capabilityId: number) => void;
  onManageDomains: (capabilityId: number) => void;
  onManageAttributes: (capabilityId: number) => void;
}

const SortableCapabilityCard: React.FC<SortableCapabilityCardProps> = ({
  capability,
  onCapabilityClick,
  onStartResearch,
  onViewReports,
  onEditClick,
  onDeleteClick,
  onViewDetails,
  onManageDomains,
  onManageAttributes,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: capability.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusIcon = (status: WorkflowState) => {
    switch (status) {
      case WorkflowState.READY:
        return '🟢';
      case WorkflowState.REVIEW:
        return '🟡';
      case WorkflowState.NEW:
        return '🔴';
      case WorkflowState.COMPLETED:
        return '✅';
      default:
        return '⚪';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        mb: 2,
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        '&:hover': { boxShadow: 4 },
        border: '1px solid',
        borderColor: 'divider',
      }}
      onClick={() => onCapabilityClick(capability)}
    >
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
            {capability.name}
          </Typography>
          <Typography variant="h5" sx={{ fontSize: '1.2rem' }}>
            {getStatusIcon(capability.status)}
          </Typography>
        </Box>

        <Chip
          label={getStatusText(capability.status)}
          color={getStatusColor(capability.status)}
          size="small"
          sx={{ mb: 2, fontSize: '0.7rem' }}
        />

        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
              Domains: {capability.domains_count}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation();
                onManageDomains(capability.id);
              }}
              sx={{ minWidth: 'auto', p: 0.5, fontSize: '0.7rem' }}
            >
              Manage
            </Button>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
              Attributes: {capability.attributes_count}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation();
                onManageAttributes(capability.id);
              }}
              sx={{ minWidth: 'auto', p: 0.5, fontSize: '0.7rem' }}
            >
              Manage
            </Button>
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
            Updated: {new Date(capability.last_updated).toLocaleDateString()}
          </Typography>
          {capability.version_string && (
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
              Version: {capability.version_string}
            </Typography>
          )}
        </Box>

        <Box display="flex" gap={0.5} justifyContent="flex-end">
          <Tooltip title="Edit Capability">
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(capability);
              }}
              sx={{ p: 0.5 }}
            >
              <EditIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete Capability">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(capability);
              }}
              sx={{ p: 0.5 }}
            >
              <DeleteIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={capability.status === 'completed' ? 'Research already completed' : 'Start Research Workflow'}>
            <span style={{ display: 'inline-block' }}>
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartResearch(capability.id, capability.name);
                }}
                disabled={capability.status === 'completed'}
                sx={{ p: 0.5 }}
              >
                <StartIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title={capability.status === 'completed' ? "View Reports" : "Reports only available for completed capabilities"}>
            <span>
              <IconButton
                size="small"
                color="secondary"
                disabled={capability.status !== 'completed'}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewReports(capability.id, capability.name);
                }}
                sx={{ p: 0.5 }}
              >
                <ReportsIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(capability.id);
              }}
              sx={{ p: 0.5 }}
            >
              <ViewIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

interface DroppableColumnProps {
  id: WorkflowState;
  title: string;
  color: 'error' | 'warning' | 'success' | 'info' | 'default';
  icon: string;
  children: React.ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
  id,
  title,
  color,
  icon,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        p: 2,
        height: 'fit-content',
        minHeight: 400,
        backgroundColor: isOver ? 'action.hover' : 'background.default',
        border: '1px solid',
        borderColor: isOver ? 'primary.main' : 'divider',
        transition: 'all 0.2s ease',
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
          {icon} {title}
        </Typography>
        <Chip
          label={React.Children.count(children)}
          size="small"
          color={color}
          sx={{ ml: 'auto' }}
        />
      </Box>
      {children}
    </Paper>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  capabilities,
  onCapabilityClick,
  onStartResearch,
  onViewReports,
  onEditClick,
  onDeleteClick,
  onViewDetails,
  onStatusChange,
  onManageDomains,
  onManageAttributes,
}) => {
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const activeCapability = capabilities.find(c => c.id === active.id);
      
      // Check if the drop target is a valid status column
      const validStatuses: WorkflowState[] = [WorkflowState.NEW, WorkflowState.REVIEW, WorkflowState.READY, WorkflowState.COMPLETED];
      if (activeCapability && validStatuses.includes(over.id as WorkflowState)) {
        const newStatus = over.id as WorkflowState;
        if (newStatus !== activeCapability.status) {
          onStatusChange(activeCapability.id, newStatus);
        }
      }
    }
  };

  const getCapabilitiesByStatus = (status: WorkflowState) => {
    return capabilities.filter(capability => capability.status === status);
  };

  const activeCapability = activeId ? capabilities.find(c => c.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 3 
      }}>
        {KANBAN_COLUMNS.map((column) => {
          const columnCapabilities = getCapabilitiesByStatus(column.id);
          
          return (
            <DroppableColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              icon={column.icon}
            >
              <SortableContext
                items={columnCapabilities.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <Box>
                  {columnCapabilities.map((capability) => (
                    <SortableCapabilityCard
                      key={capability.id}
                      capability={capability}
                      onCapabilityClick={onCapabilityClick}
                      onStartResearch={onStartResearch}
                      onViewReports={onViewReports}
                      onEditClick={onEditClick}
                      onDeleteClick={onDeleteClick}
                      onViewDetails={onViewDetails}
                      onManageDomains={onManageDomains}
                      onManageAttributes={onManageAttributes}
                    />
                  ))}
                </Box>
              </SortableContext>
              
              {columnCapabilities.length === 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 100,
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="body2">No capabilities</Typography>
                </Box>
              )}
            </DroppableColumn>
          );
        })}
      </Box>

      <DragOverlay>
        {activeCapability ? (
          <Card
            sx={{
              width: 280,
              boxShadow: 8,
              opacity: 0.8,
              transform: 'rotate(5deg)',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                {activeCapability.name}
              </Typography>
              <Chip
                label={getStatusText(activeCapability.status)}
                color={getStatusColor(activeCapability.status)}
                size="small"
                sx={{ mt: 1, fontSize: '0.7rem' }}
              />
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard; 