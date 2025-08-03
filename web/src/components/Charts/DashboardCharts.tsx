import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography
} from '@mui/material';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface ChartProps {
  data: any;
  title: string;
  height?: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000', '#00ff00'];

export const RadarChartComponent: React.FC<ChartProps> = ({ data, title, height = 400 }) => {
  const chartData = data.attributes.map((attribute: string, index: number) => {
    const point: any = { attribute };
    data.vendors.forEach((vendor: string, vendorIndex: number) => {
      point[vendor] = data.scores[vendorIndex][index];
    });
    return point;
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="attribute" />
            <PolarRadiusAxis angle={90} domain={[0, 5]} />
            {data.vendors.map((vendor: string, index: number) => (
              <Radar
                key={vendor}
                name={vendor}
                dataKey={vendor}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.3}
              />
            ))}
            <Tooltip />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const BarChartComponent: React.FC<ChartProps> = ({ data, title, height = 400 }) => {
  const chartData = data.attributes.map((attribute: string, index: number) => {
    const point: any = { attribute };
    data.vendors.forEach((vendor: string) => {
      point[vendor] = data.scores[vendor][index];
    });
    return point;
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="attribute" />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Legend />
            {data.vendors.map((vendor: string, index: number) => (
              <Bar
                key={vendor}
                dataKey={vendor}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const LineChartComponent: React.FC<ChartProps> = ({ data, title, height = 400 }) => {
  const chartData = data.attributes.map((attribute: string, index: number) => {
    const point: any = { attribute };
    data.vendors.forEach((vendor: string) => {
      point[vendor] = data.scores[vendor][index];
    });
    return point;
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="attribute" />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Legend />
            {data.vendors.map((vendor: string, index: number) => (
              <Line
                key={vendor}
                type="monotone"
                dataKey={vendor}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const AreaChartComponent: React.FC<ChartProps> = ({ data, title, height = 400 }) => {
  const chartData = data.attributes.map((attribute: string, index: number) => {
    const point: any = { attribute };
    data.vendors.forEach((vendor: string) => {
      point[vendor] = data.scores[vendor][index];
    });
    return point;
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="attribute" />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Legend />
            {data.vendors.map((vendor: string, index: number) => (
              <Area
                key={vendor}
                type="monotone"
                dataKey={vendor}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const PieChartComponent: React.FC<ChartProps> = ({ data, title, height = 400 }) => {
  // Calculate average scores for each vendor
  const pieData = data.vendors.map((vendor: string, index: number) => {
    const scores = data.scores[vendor] || data.scores[index];
    const averageScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
    return {
      name: vendor,
      value: averageScore
    };
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const ScoreDistributionChart: React.FC<ChartProps> = ({ data, title, height = 400 }) => {
  const chartData = data.score_ranges.map((range: string, index: number) => {
    const point: any = { range };
    data.vendors.forEach((vendor: string) => {
      point[vendor] = data.vendor_counts[vendor][index];
    });
    return point;
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Legend />
            {data.vendors.map((vendor: string, index: number) => (
              <Bar
                key={vendor}
                dataKey={vendor}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const WeightedScoresChart: React.FC<ChartProps> = ({ data, title, height = 400 }) => {
  const weightedScores = data.vendors.map((vendor: string) => {
    const scores = data.scores[vendor];
    const totalScore = data.attributes.reduce((sum: number, _: string, index: number) => {
      return sum + (scores[index] * data.weights[index]);
    }, 0);
    const totalWeight = data.weights.reduce((sum: number, weight: number) => sum + weight, 0);
    return {
      vendor,
      weightedScore: totalWeight > 0 ? totalScore / totalWeight : 0
    };
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={weightedScores}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="vendor" />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Bar dataKey="weightedScore" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const ChartGrid: React.FC<{ charts: React.ReactNode[] }> = ({ charts }) => {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
      {charts}
    </Box>
  );
}; 