import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface MiniChartProps {
  data: ChartDataPoint[];
  type?: 'line' | 'area' | 'bar' | 'pie';
  dataKey?: string;
  height?: number;
  showAxis?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  colors?: string[];
  className?: string;
}

// Chart colors - uses CSS variable for brand color which adapts to context
// In dashboard-theme: gold (45 93% 47%), otherwise: blue (199 89% 48%)
const CHART_COLORS = [
  'hsl(var(--brand))',       // Primary brand color (dynamic)
  'hsl(142, 76%, 36%)',      // Green
  'hsl(262, 83%, 58%)',      // Purple
  'hsl(199, 89%, 48%)',      // Blue
  'hsl(0, 0%, 60%)',         // Gray
];

export const MiniChart = ({
  data,
  type = 'area',
  dataKey = 'value',
  height = 120,
  showAxis = false,
  showGrid = false,
  showTooltip = true,
  colors = CHART_COLORS,
  className,
}: MiniChartProps) => {
  const primaryColor = colors[0];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-foreground font-medium text-sm">
            {payload[0].payload.name}
          </p>
          <p className="text-muted-foreground text-xs">
            {typeof payload[0].value === 'number' 
              ? payload[0].value.toLocaleString() 
              : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />}
            {showAxis && <XAxis dataKey="name" stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showAxis && <YAxis stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={primaryColor} 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />}
            {showAxis && <XAxis dataKey="name" stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showAxis && <YAxis stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={primaryColor} 
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />}
            {showAxis && <XAxis dataKey="name" stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showAxis && <YAxis stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Bar 
              dataKey={dataKey} 
              fill={primaryColor}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={height * 0.25}
              outerRadius={height * 0.4}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default MiniChart;
