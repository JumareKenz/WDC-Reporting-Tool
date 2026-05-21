/**
 * ChartMessage Component
 * Renders data visualization charts using recharts
 */
import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Default colors for charts
const DEFAULT_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

/**
 * ChartMessage Component
 */
const ChartMessage = ({ 
  chartData = {}, 
  title = 'Chart',
  className = '' 
}) => {
  const {
    chart_type = 'bar',
    labels = [],
    datasets = [],
    options = {}
  } = chartData;

  // Transform data for recharts format
  const chartDataFormatted = labels.map((label, index) => {
    const dataPoint = { name: label };
    datasets.forEach((dataset, datasetIndex) => {
      dataPoint[dataset.label || `Series ${datasetIndex + 1}`] = dataset.data?.[index] || 0;
    });
    return dataPoint;
  });

  // For pie charts, format differently
  const pieData = labels.map((label, index) => ({
    name: label,
    value: datasets[0]?.data?.[index] || 0
  }));

  // Render appropriate chart type
  const renderChart = () => {
    switch (chart_type) {
      case 'line':
        return (
          <LineChart data={chartDataFormatted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            {datasets.map((dataset, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={dataset.label || `Series ${index + 1}`}
                stroke={dataset.borderColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                strokeWidth={2}
                dot={{ fill: dataset.borderColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length], r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={chartDataFormatted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              {datasets.map((dataset, index) => (
                <linearGradient
                  key={index}
                  id={`colorGradient${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop 
                    offset="5%" 
                    stopColor={dataset.borderColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                    stopOpacity={0.3}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={dataset.borderColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            {datasets.map((dataset, index) => (
              <Area
                key={index}
                type="monotone"
                dataKey={dataset.label || `Series ${index + 1}`}
                stroke={dataset.borderColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                fill={`url(#colorGradient${index})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [value, name]}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
          </PieChart>
        );

      case 'bar':
      default:
        return (
          <BarChart data={chartDataFormatted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            {datasets.map((dataset, index) => (
              <Bar
                key={index}
                dataKey={dataset.label || `Series ${index + 1}`}
                fill={dataset.backgroundColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
    }
  };

  if (!labels.length || !datasets.length) {
    return (
      <div className={`p-4 bg-neutral-50 rounded-lg border border-neutral-200 ${className}`}>
        <p className="text-neutral-500 text-sm">No chart data available</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-neutral-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <h4 className="font-semibold text-neutral-900">{title}</h4>
        {options?.subtitle && (
          <p className="text-xs text-neutral-500 mt-0.5">{options.subtitle}</p>
        )}
      </div>

      {/* Chart */}
      <div className="p-4">
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartMessage;
