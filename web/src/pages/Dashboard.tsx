import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,

  Paper,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {

  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { fetchCapabilities } from '../store/slices/capabilitiesSlice';
import { addNotification } from '../store/slices/uiSlice';
import RecentActivity from '../components/RecentActivity';



interface RecentActivity {
  id: string;
  type: 'capability_created' | 'research_completed' | 'status_updated' | 'report_generated';
  message: string;
  timestamp: string;
  capability_name?: string;
}

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { capabilitySummaries, workflowStats, loading, error } = useSelector((state: RootState) => state.capabilities);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchCapabilities() as any);
      await loadRecentActivity();
    } catch (err) {
      dispatch(addNotification({
        message: 'Failed to load dashboard data',
        type: 'error'
      }));
    } finally {
      setRefreshing(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Simulate recent activity based on capabilities data
      const activities: RecentActivity[] = [];
      
      if (capabilitySummaries && capabilitySummaries.length > 0) {
        // Add recent capability updates
        const recentCapabilities = [...capabilitySummaries]
          .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
          .slice(0, 3);

        recentCapabilities.forEach((cap) => {
          activities.push({
            id: `cap-${cap.id}`,
            type: cap.status === 'completed' ? 'research_completed' : 'status_updated',
            message: cap.status === 'completed' 
              ? `Research completed for ${cap.name}`
              : `Status updated to ${cap.status} for ${cap.name}`,
            timestamp: cap.last_updated,
            capability_name: cap.name
          });
        });

        // Add some simulated activities
        if (capabilitySummaries.length > 0) {
          activities.push({
            id: 'report-1',
            type: 'report_generated',
            message: 'Comprehensive report generated for Billing Management',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            capability_name: 'Billing Management'
          });
        }
      }

      setRecentActivity([...activities].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (err) {
      console.error('Failed to load recent activity:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'ready': return 'primary';
      case 'review': return 'warning';
      case 'new': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon />;
      case 'ready': return <TrendingUpIcon />;
      case 'review': return <WarningIcon />;
      case 'new': return <ScheduleIcon />;
      default: return <AssignmentIcon />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'capability_created': return <StorageIcon />;
      case 'research_completed': return <CheckCircleIcon />;
      case 'status_updated': return <TimelineIcon />;
      case 'report_generated': return <AssessmentIcon />;
      default: return <AssignmentIcon />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'research_completed': return 'success';
      case 'report_generated': return 'primary';
      case 'status_updated': return 'info';
      case 'capability_created': return 'secondary';
      default: return 'default';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (loading && !refreshing) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4" gutterBottom>
          📊 Dashboard
      </Typography>
        <Chip
          icon={<RefreshIcon />}
          label="Refresh"
          onClick={loadDashboardData}
          disabled={refreshing}
          clickable
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Workflow Statistics */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Workflow Overview
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {workflowStats?.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                  Total Capabilities
                </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {workflowStats?.completed || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
          </CardContent>
        </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {workflowStats?.readyForResearch || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                  Ready for Research
                </Typography>
          </CardContent>
        </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {workflowStats?.reviewRequired || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                  Review Required
                </Typography>
          </CardContent>
        </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {workflowStats?.domainAnalysis || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                  Domain Analysis
                </Typography>
          </CardContent>
        </Card>
      </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        {/* Recent Capabilities */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Capabilities
          </Typography>
          {capabilitySummaries && capabilitySummaries.length > 0 ? (
            <List>
              {[...capabilitySummaries]
                .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
                .slice(0, 5)
                .map((capability, index) => (
                  <React.Fragment key={capability.id}>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(capability.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={capability.name}
                        secondary={
                          <Typography component="div" variant="body2" color="text.secondary">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip
                                label={capability.status}
                                size="small"
                                color={getStatusColor(capability.status) as any}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {capability.attributes_count} attributes • {capability.domains_count} domains
                              </Typography>
                            </Box>
                          </Typography>
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(capability.last_updated)}
                      </Typography>
                    </ListItem>
                    {index < Math.min(4, capabilitySummaries.length - 1) && <Divider />}
                  </React.Fragment>
                ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No capabilities found
            </Typography>
          )}
        </Paper>

        {/* Recent Activity */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          {recentActivity.length > 0 ? (
            <List>
              {recentActivity.slice(0, 5).map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem>
                    <ListItemIcon>
                      <Box sx={{ color: `${getActivityColor(activity.type)}.main` }}>
                        {getActivityIcon(activity.type)}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.message}
                      secondary={formatTimeAgo(activity.timestamp)}
                    />
                  </ListItem>
                  {index < Math.min(4, recentActivity.length - 1) && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No recent activity
            </Typography>
          )}
        </Paper>
          </Box>
    </Box>
  );
};

export default Dashboard; 